import { CallType } from "@zerodev/sdk/types";
import Big from "big.js";
import { encodeFunctionData, zeroAddress } from "viem";

import { ERC20_TRANSFER_ABI } from "../../dependencies";
import { genRanHex, isTestEnv } from "../../dependencies/environment";
import { logger } from "../../dependencies/logger";
import IExecutorClient from "../interfaces/clients/executor";
import ILockersRepo from "../interfaces/repos/lockers";
import IPoliciesRepo from "../interfaces/repos/policies";
import ITokenTxsRepo from "../interfaces/repos/tokenTxs";
import IOffRampRepo from "../interfaces/repos/offramp";
import IAutomationService from "../interfaces/services/automation";
import { LockerInDb } from "../schemas/lockers";
import {
	EAutomationType,
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
	policiesRepo: IPoliciesRepo;

	tokenTxsRepo: ITokenTxsRepo;

	lockersRepo: ILockersRepo;

	offRampRepo: IOffRampRepo;

	callDataExecutor: IExecutorClient;

	constructor(
		policiesRepo: IPoliciesRepo,
		tokenTxsRepo: ITokenTxsRepo,
		lockersRepo: ILockersRepo,
		offRampRepo: IOffRampRepo,
		callDataExecutor: IExecutorClient
	) {
		this.policiesRepo = policiesRepo;
		this.tokenTxsRepo = tokenTxsRepo;
		this.lockersRepo = lockersRepo;
		this.offRampRepo = offRampRepo;
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

		console.log("shouldGenerateAutomations", maybeTrigger);

		// Only generate automations from deposits
		if (lockerDirection !== ETokenTxLockerDirection.IN) return false;

		// Don't generate automations mulitple times
		if (automationsState !== ETokenTxAutomationsState.NOT_STARTED)
			return false;

		console.log("Checking confirmed");
		// Don't automate unconfirmed transactions
		if (!isConfirmed) return false;

		console.log("Checking policy");
		// Retrieve the policy for the locker
		const policy = await this.policiesRepo.retrieve(
			{ lockerId, chainId },
			true
		);
		if (!policy) return false;

		console.log("Checking encrytedSessionKey");
		// If no policy is found, don't generate automations
		const { encryptedSessionKey } = policy as PolicyInDb;
		if (!encryptedSessionKey) return false;

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
		// Disable ETH automations
		if (maybeTrigger.contractAddress === zeroAddress) return null;

		const { lockerId } = policy;
		const { contractAddress, tokenSymbol, tokenDecimals, chainId, amount } =
			maybeTrigger;
		const { address: fromAddress } = locker;

		// get recipient address
		// TODO: standardize generalize method across all automation types in db
		let toAddress;
		const { allocation: allocationPercent } = automation;

		if (automation.type == EAutomationType.OFF_RAMP) {
			const offRampAccount = await this.offRampRepo.retrieve({
				lockerId: locker.id,
			});

			toAddress = (await this.offRampRepo.getAddressOffRampAddress(
				offRampAccount!.id,
				policy.chainId
			)) as `0x${string}`;
		} else if (automation.type == EAutomationType.FORWARD_TO) {
			({ recipientAddress: toAddress } = automation);
		}

		if (!toAddress) return null;

		// construct web3 transaction, using session key
		const allocationDecimal = allocationPercent / 100;
		const amountOutStr = Big(amount.toString())
			.times(allocationDecimal)
			.toFixed(0);

		const amountOut = BigInt(amountOutStr);

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const erc20UnencodedData: any = {
			abi: ERC20_TRANSFER_ABI,
			functionName: "transfer",
			args: [toAddress, amountOut],
		};

		const erc20Data = encodeFunctionData(erc20UnencodedData);

		const callDataArgs = {
			to: contractAddress,
			value: BigInt(0),
			data: erc20Data,
			callType: "call" as CallType,
		};

		// submit on-chain
		let txHash = genRanHex(64) as `0x${string}`;
		if (!isTestEnv()) {
			txHash = (await this.callDataExecutor.execCallDataWithPolicy({
				policy,
				callDataArgs,
			})) as `0x${string}`;
			console.log("Transaction sent", txHash);
		}

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

		const spawnedTx = await this.tokenTxsRepo.create(triggeredTx);

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
			// Pre-execution checks
			if (!policy.sessionKeyIsValid) return null;

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
		const policy = await this.policiesRepo.retrieve(
			{ lockerId, chainId },
			true
		);

		// If no existing policy, automations can't be run
		if (!policy) return [];

		const locker = await this.lockersRepo.retrieve({ id: lockerId });
		// Should never happen, but just in case
		if (!locker) return [];

		// Retrieve locker itself so we can get it's address

		const policyApi = policy as PolicyRepoAdapter;
		if (!policyApi.encryptedSessionKey) return [];
		const { automations } = policy;

		const delay = (ms: number) =>
			new Promise((resolve) => setTimeout(resolve, ms));

		const spawnedAutomationsPromises: Promise<TokenTxInDb | null>[] = [];

		for (const automation of automations) {
			const promise = this.spawnAutomation(
				maybeTrigger,
				automation,
				policyApi,
				locker
			);
			spawnedAutomationsPromises.push(promise);
			await delay(10000); // Wait for 10 seconds before the next iteration
		}

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

		console.log("Should generate", shouldGenerate);

		if (!shouldGenerate) return false;

		// set automationState to started
		await this.tokenTxsRepo.create({
			...maybeTrigger,
			automationsState: ETokenTxAutomationsState.STARTED,
		});

		await this.spawnAutomations(maybeTrigger);

		return true;
	}
}
