import { CallType } from "@zerodev/sdk/types";
import Big from "big.js";
import { encodeFunctionData, pad, zeroAddress } from "viem";

import { ERC20_TRANSFER_ABI } from "../../dependencies";
import { genRanHex, isTestEnv } from "../../dependencies/environment";
import { logger } from "../../dependencies/logger";
import IExecutorClient from "../interfaces/clients/executor";
import ILockersRepo from "../interfaces/repos/lockers";
import IOffRampRepo from "../interfaces/repos/offramp";
import IPoliciesRepo from "../interfaces/repos/policies";
import ITokenTxsRepo from "../interfaces/repos/tokenTxs";
import IAutomationService from "../interfaces/services/automation";
import { LockerInDb } from "../schemas/lockers";
import {
	EAutomationStatus,
	EAutomationType,
	EAutomationUserState,
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

	offRampRepo: IOffRampRepo;

	constructor(
		policiesApi: IPoliciesRepo,
		tokenTxsApi: ITokenTxsRepo,
		lockersApi: ILockersRepo,
		offRampRepo: IOffRampRepo,
		callDataExecutor: IExecutorClient
	) {
		this.policiesApi = policiesApi;
		this.tokenTxsApi = tokenTxsApi;
		this.lockersApi = lockersApi;
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
		const policy = await this.policiesApi.retrieve(
			{ lockerId, chainId },
			true
		);
		if (!policy) {
			console.log(
				`No policy found for locker ${lockerId} and chain ${chainId}`
			);
			return false;
		}

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
		// const { recipientAddress: toAddress, allocation } = automation;

		// get recipient address
		// TODO: standardize generalize method across all automation types in db
		let toAddress;
		const { allocation } = automation;

		if (automation.type === EAutomationType.OFF_RAMP) {
			const offRampAccount = await this.offRampRepo.retrieve({
				lockerId: locker.id,
			});

			toAddress = (await this.offRampRepo.getAddressOffRampAddress(
				offRampAccount!.id,
				policy.chainId,
				contractAddress.toLowerCase()
			)) as `0x${string}`;
		} else if (automation.type === EAutomationType.FORWARD_TO) {
			({ recipientAddress: toAddress } = automation);
		}

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
		console.log("erc20UnencodedData", erc20UnencodedData);

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
			try {
				console.log("Preparing userOp", callDataArgs);
				txHash = (await this.callDataExecutor.execCallDataWithPolicy({
					policy,
					callDataArgs,
					scope: `${scope}-${contractAddress}-${toAddress}-${maybeTrigger.id}`,
				})) as `0x${string}`;
				console.log("Transaction sent", txHash);
			} catch (e) {
				console.error("Unable to send userOp", e);
				return null;
			}
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
			amount: amountOutStr,
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
		let toAddress;
		const { allocation } = automation;

		// If offramp, then send ETH to vendor address
		if (automation.type === EAutomationType.OFF_RAMP) {
			const offRampAccount = await this.offRampRepo.retrieve({
				lockerId: locker.id,
			});

			toAddress = (await this.offRampRepo.getAddressOffRampAddress(
				offRampAccount!.id,
				policy.chainId,
				zeroAddress
			)) as `0x${string}`;
		} else if (automation.type === EAutomationType.FORWARD_TO) {
			({ recipientAddress: toAddress } = automation);
		}

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
		console.log("erc20UnencodedData", erc20UnencodedData);

		const callDataArgs = {
			to: toAddress,
			value: amountOut,
			data: pad("0x", { size: 4 }),
			callType: "call" as CallType,
		};

		// submit on-chain
		// testing hack where we simulate sending a tx in test
		let txHash = genRanHex(64) as `0x${string}`;
		if (!isTestEnv()) {
			console.log("Preparing tx", callDataArgs);
			txHash = (await this.callDataExecutor.execCallDataWithPolicy({
				policy,
				callDataArgs,
				scope: `${scope}-${toAddress}-${maybeTrigger.id}`,
			})) as `0x${string}`;
		}
		console.log("Transaction sent", txHash);

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
			amount: amountOutStr,
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
		console.log("Spawning on-chain tx");
		console.log(automation);
		// console.log(policy);
		console.log(maybeTrigger);
		console.log(locker);

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
			// Ensure automation is ready and active
			if (automation.status !== EAutomationStatus.READY) return null;

			// For backwards compatibility, assume automations are on if userState is missing
			if (automation.userState === EAutomationUserState.OFF) return null;

			// only forwarding and offramp can trigger automations
			if (
				automation.type !== EAutomationType.OFF_RAMP &&
				automation.type !== EAutomationType.FORWARD_TO
			)
				return null;

			switch (automation.type) {
				case EAutomationType.FORWARD_TO:
					return await this.spawnOnChainTx(
						maybeTrigger,
						automation,
						policy,
						locker,
						EAutomationType.FORWARD_TO
					);
				case EAutomationType.OFF_RAMP:
					return await this.spawnOnChainTx(
						maybeTrigger,
						automation,
						policy,
						locker,
						EAutomationType.OFF_RAMP
					);

				default:
					return null;
			}
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
		} catch (e: any) {
			logger.error(
				`Failed to spawn automation for ${maybeTrigger.id}`,
				automation,
				e
			);
			return null;
		}
	}

	/**
	 * Loop through all automations in policy corresponding to the trigger.
	 * Create an outbound transfer for each automation proportional to split.
	 * @param maybeTrigger
	 * @returns persisted outbound automations
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

		// Retrieve locker itself so we can get it's address
		const locker = await this.lockersApi.retrieve({ id: lockerId });

		// Should never happen, but just in case
		if (!locker) return [];

		const policyApi = policy as PolicyRepoAdapter;
		if (!policyApi.encryptedSessionKey) return [];
		const { automations } = policy;

		const tokenTxs = [];

		console.log("Automations", automations);
		// eslint-disable-next-line no-restricted-syntax
		for (const automation of automations) {
			console.log("Automation", automation);
			// Don't process automations that transfer nothing
			if (automation.allocation === 0) {
				console.log("Skipping automation with 0 allocation");
				// eslint-disable-next-line no-continue
				continue;
			}

			const spawnedAutomation = this.spawnAutomation(
				maybeTrigger,
				automation,
				policyApi,
				locker
			);

			// eslint-disable-next-line no-await-in-loop
			const tokenTx = await spawnedAutomation;
			console.log("Successfully spawned automation", tokenTx);
			if (tokenTx) {
				tokenTxs.push(tokenTx);
				// Add 3-second delay at the end of each iteration
				// Something is wrong with nonces and if multiple userops are sent back-to-back it fails
				const sleepFor = process.env.TX_SLEEP_FOR
					? parseInt(process.env.TX_SLEEP_FOR)
					: 2000;
				console.log(`Sleeping for ${sleepFor}ms`);
				// eslint-disable-next-line no-await-in-loop
				await new Promise((resolve) => {
					setTimeout(resolve, sleepFor);
				});
			} else {
				console.log("no automation spawned");
			}
		}

		console.log("Finished spawning automations", tokenTxs);
		return tokenTxs;
		// const spawnedAutomationsPromises = automations.map((automation) =>
		// 	this.spawnAutomation(maybeTrigger, automation, policyApi, locker)
		// );

		// const spawnedAutomations = await Promise.all(
		// 	spawnedAutomationsPromises
		// );

		// // Remove automations that failed to spawn
		// return spawnedAutomations.filter(
		// 	(spawnedAutomation) => spawnedAutomation !== null
		// ) as TokenTxInDb[];
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
		const startedTx = {
			...maybeTrigger,
			automationsState: ETokenTxAutomationsState.STARTED,
		};
		console.log("maybeTrigger", maybeTrigger);
		console.log("startedTx", startedTx);
		await this.tokenTxsApi.create(startedTx);

		await this.spawnAutomations(maybeTrigger);

		return true;
	}
}
