import { CallType } from "@zerodev/sdk/types";
import Big from "big.js";
import { encodeFunctionData, pad, zeroAddress } from "viem";

import { ERC20_TRANSFER_ABI } from "../../dependencies";
import { genRanHex, isTestEnv } from "../../dependencies/environment";
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
		const policy = await this.policiesApi.retrieve(
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

	async spawnOnChainErc20Tx(
		maybeTrigger: TokenTxInDb,
		automation: IAutomation,
		policy: PolicyRepoAdapter,
		locker: LockerInDb,
		scope: string
	): Promise<TokenTxInDb | null> {
		console.log("spawnOnChainErc20Tx");
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

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const erc20UnencodedData: any = {
			abi: ERC20_TRANSFER_ABI,
			functionName: "transfer",
			args: [toAddress, amountOut],
		};
		logger.debug("erc20UnencodedData", erc20UnencodedData);

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
			logger.debug("Preparing userOp", callDataArgs);
			txHash = (await this.callDataExecutor.execCallDataWithPolicy({
				policy,
				callDataArgs,
				scope: `${scope}-${contractAddress}-${maybeTrigger.id}`,
			})) as `0x${string}`;
			logger.debug("Transaction sent", txHash);
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

		const spawnedTx = await this.tokenTxsApi.create(triggeredTx);

		return spawnedTx;
	}

	async spawnOnChainEthTx(
		maybeTrigger: TokenTxInDb,
		automation: IAutomation,
		policy: PolicyRepoAdapter,
		locker: LockerInDb,
		scope: string
	): Promise<TokenTxInDb | null> {
		console.log("spawnOnChainEthTx");
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

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const erc20UnencodedData: any = {
			abi: ERC20_TRANSFER_ABI,
			functionName: "transfer",
			args: [toAddress, amountOut],
		};
		logger.debug("erc20UnencodedData", erc20UnencodedData);

		const callDataArgs = {
			to: toAddress,
			value: amountOut,
			data: pad("0x", { size: 4 }),
			callType: "call" as CallType,
		};

		// submit on-chain
		let txHash = genRanHex(64) as `0x${string}`;
		if (!isTestEnv()) {
			logger.debug("Preparing tx", callDataArgs);
			txHash = (await this.callDataExecutor.execCallDataWithPolicy({
				policy,
				callDataArgs,
				scope: `${scope}-${toAddress}-${maybeTrigger.id}`,
			})) as `0x${string}`;
			logger.debug("Transaction sent", txHash);
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

		const spawnedTx = await this.tokenTxsApi.create(triggeredTx);

		return spawnedTx;
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
		locker: LockerInDb,
		// used for the key of the nonce
		scope: string = "default"
	): Promise<TokenTxInDb | null> {
		logger.debug("Spawning on-chain tx");
		logger.debug(automation);
		// console.log(policy);
		logger.debug(maybeTrigger);
		logger.debug(locker);

		// Process ETH transactions
		if (maybeTrigger.contractAddress === zeroAddress) {
			return this.spawnOnChainEthTx(
				maybeTrigger,
				automation,
				policy,
				locker,
				scope
			);
		}

		// Otherwise, process as ERC20 transaction
		return this.spawnOnChainErc20Tx(
			maybeTrigger,
			automation,
			policy,
			locker,
			scope
		);
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
					return await this.spawnOnChainTx(
						maybeTrigger,
						automation,
						policy,
						locker,
						"forward_to"
					);
				case "off_ramp":
					return await this.spawnOnChainTx(
						maybeTrigger,
						automation,
						policy,
						locker,
						"off_ramp"
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

		logger.debug("Should generate", shouldGenerate);

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
