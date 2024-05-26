import { CallType } from "@zerodev/sdk/types";
import Big from "big.js";
import { encodeFunctionData } from "viem";

import { ERC20_TRANSFER_ABI } from "../../dependencies";
import { logger } from "../../dependencies/logger";
import IExecutorClient from "../interfaces/clients/executor";
import ILockersRepo from "../interfaces/repos/lockers";
import IPoliciesRepo from "../interfaces/repos/policies";
import ITokenTxsRepo from "../interfaces/repos/tokenTxs";
import IAutomationService from "../interfaces/services/automation";
import { LockerInDb } from "../schemas/lockers";
import {
	IAutomation,
	PolicyInDb,
	PolicyRepoAdapter,
} from "../schemas/policies";
import {
	ETokenTxAutomationsState,
	ETokenTxLockerDirection,
	TokenTxInDb,
	TokenTxRepoAdapter,
} from "../schemas/tokenTxs";

export default class AutomationService implements IAutomationService {
	policiesApi: IPoliciesRepo;

	tokenTxsApi: ITokenTxsRepo;

	lockersApi: ILockersRepo;

	callDataExecutor: IExecutorClient;

	constructor(
		policiesApi: IPoliciesRepo,
		tokenTxsApi: ITokenTxsRepo,
		lockersApi: ILockersRepo,
		callDataExecutor: IExecutorClient
	) {
		this.policiesApi = policiesApi;
		this.tokenTxsApi = tokenTxsApi;
		this.lockersApi = lockersApi;
		this.callDataExecutor = callDataExecutor;
	}

	public async shouldGenerateAutomations(
		maybeTrigger: TokenTxInDb
	): Promise<boolean> {
		const {
			lockerDirection,
			automationsState,
			isConfirmed,
			lockerId,
			chainId,
		} = maybeTrigger;

		// Only generate automations from deposits
		if (lockerDirection !== ETokenTxLockerDirection.IN) return false;

		// Don't generate automations mulitple times
		if (automationsState !== ETokenTxAutomationsState.NOT_STARTED)
			return false;

		// Don't automate unconfirmed transactions
		if (!isConfirmed) return false;

		// Retrieve the policy for the locker
		const policy = await this.policiesApi.retrieve(
			{ lockerId, chainId },
			true
		);

		// If no policy is found, don't generate automations
		const { encryptedSessionKey } = policy as PolicyInDb;
		if (!policy || !encryptedSessionKey) return false;

		return true;
	}

	/**
	 * Send a transaction/userOp on-chain and persist to DB.
	 * Send amount is based on percentage defined in automation.
	 * @param maybeTrigger
	 * @param automation
	 * @returns
	 */
	async spawnOnChainTx(
		maybeTrigger: TokenTxInDb,
		automation: IAutomation,
		policy: PolicyRepoAdapter,
		locker: LockerInDb
	): Promise<TokenTxInDb | null> {
		const { lockerId } = policy;
		const { contractAddress, tokenSymbol, tokenDecimals, chainId, amount } =
			maybeTrigger;
		const { address: fromAddress } = locker;
		const { recipientAddress: toAddress, allocation } = automation;

		if (!toAddress) return null;

		// construct web3 transaction, using session key
		const amountOutStr = Big(amount.toString())
			.times(allocation)
			.toFixed(0);

		const amountOut = BigInt(amountOutStr);

		const erc20Data = encodeFunctionData({
			abi: ERC20_TRANSFER_ABI,
			functionName: "transfer",
			args: [toAddress, amountOut],
		});

		const callDataArgs = {
			to: contractAddress,
			value: BigInt(0),
			data: erc20Data,
			callType: "call" as CallType,
		};

		// submit on-chain
		const txHash = (await this.callDataExecutor.execCallDataWithPolicy({
			policy,
			callDataArgs,
		})) as `0x${string}`;

		// Persist to DB.
		// This TX will also be picked up by Moralis, but here we can record what triggered this automation.
		const triggeredTx: TokenTxRepoAdapter = {
			lockerId,
			txHash,
			contractAddress,
			tokenSymbol,
			fromAddress,
			toAddress,
			tokenDecimals,
			isConfirmed: false,
			amount: amountOut,
			chainId,
			lockerDirection: ETokenTxLockerDirection.OUT,
			automationsState: ETokenTxAutomationsState.STARTED,
			triggeredByTokenTxId: maybeTrigger.id,
		};

		const spawnedTx = await this.tokenTxsApi.create(triggeredTx);

		return spawnedTx;
	}

	/**
	 * Return null if spawning fails.
	 * All automations run in the same thread, so we don't want to
	 * prevent other automations from running by throwing a terminal exception.
	 * @param maybeTrigger
	 * @param automation
	 */
	public async spawnAutomation(
		maybeTrigger: TokenTxInDb,
		automation: IAutomation,
		policy: PolicyRepoAdapter,
		locker: LockerInDb
	): Promise<TokenTxInDb | null> {
		try {
			// Ensure off
			if (automation.status !== "ready") return null;

			if (automation.type === "savings") return null;

			switch (automation.type) {
				case "forward_to":
				case "off_ramp":
					return await this.spawnOnChainTx(
						maybeTrigger,
						automation,
						policy,
						locker
					);

				default:
					return null;
			}
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
		} catch (e: any) {
			logger.error(
				`Failed to spawn automation for ${maybeTrigger.id}`,
				e
			);
			return null;
		}
	}

	/**
	 * Loop through all automations in policy corresponding to the trigger.
	 * Create an outbound transfer for each automation proportional to split.
	 * @param maybeTrigger
	 * @returns
	 */
	public async spawnAutomations(
		maybeTrigger: TokenTxInDb
	): Promise<TokenTxInDb[]> {
		const { lockerId, chainId } = maybeTrigger;

		// Retrieve the policy for the locker so we know it is deployed and has session keys
		const policy = await this.policiesApi.retrieve(
			{ lockerId, chainId },
			true
		);

		// If no existing policy, automations can't be run
		if (!policy) return [];

		const locker = await this.lockersApi.retrieve({ id: lockerId });
		// Should never happen, but just in case
		if (!locker) return [];

		// Retrieve locker itself so we can get it's address

		const policyApi = policy as PolicyRepoAdapter;
		if (!policyApi.encryptedSessionKey) return [];
		const { automations } = policy;

		const spawnedAutomationsPromises = automations.map((automation) =>
			this.spawnAutomation(maybeTrigger, automation, policyApi, locker)
		);

		const spawnedAutomations = await Promise.all(
			spawnedAutomationsPromises
		);

		// Remove automations that failed to spawn
		return spawnedAutomations.filter(
			(spawnedAutomation) => spawnedAutomation !== null
		) as TokenTxInDb[];
	}

	/**
	 * Check if the trigger should generate automations.
	 * If so, mark the trigger as STARTED
	 * Then perform on-chain actions and record in DB
	 * @param maybeTrigger
	 * @returns
	 */
	public async generateAutomations(
		maybeTrigger: TokenTxInDb
	): Promise<boolean> {
		const shouldGenerate =
			await this.shouldGenerateAutomations(maybeTrigger);

		if (!shouldGenerate) return false;

		// set automationState to started
		await this.tokenTxsApi.create({
			...maybeTrigger,
			automationsState: ETokenTxAutomationsState.STARTED,
		});

		await this.spawnAutomations(maybeTrigger);

		return true;
	}
}