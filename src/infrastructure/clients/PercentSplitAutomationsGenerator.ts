import Big from "big.js";

import IAutomationsGenerator from "../../usecases/interfaces/clients/IAutomationsGenerator";
import IPoliciesRepo from "../../usecases/interfaces/repos/policies";
import ITokenTxsRepo from "../../usecases/interfaces/repos/tokenTxs";
import { LockerInDb } from "../../usecases/schemas/lockers";
import {
	IAutomation,
	PolicyInDb,
	PolicyRepoAdapter,
} from "../../usecases/schemas/policies";
import {
	ETokenTxAutomationsState,
	ETokenTxLockerDirection,
	TokenTxInDb,
} from "../../usecases/schemas/tokenTxs";

export default class PercentSplitAutomationsGenerator
	implements IAutomationsGenerator
{
	policiesApi: IPoliciesRepo;

	tokenTxsApi: ITokenTxsRepo;

	constructor(policiesApi: IPoliciesRepo, tokenTxsApi: ITokenTxsRepo) {
		this.policiesApi = policiesApi;
		this.tokenTxsApi = tokenTxsApi;
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

		const amountOutStr = Big(amount.toString())
			.times(allocation)
			.toFixed(tokenDecimals);

		const amountOut = BigInt(amountOutStr);
		// construct web3 transaction, using session key
		// construct db transaction
		// submit on-chain
		// append txHash to db transaction
		// finally return constructed transaction
		return {
			lockerId,
			contractAddress,
			// txHash: `0x${string}`;
			tokenSymbol,
			fromAddress,
			toAddress,
			tokenDecimals,
			isConfirmed: false,
			amount: amountOut,
			chainId,
			lockerDirection: ETokenTxLockerDirection.OUT,
			automationsState: ETokenTxAutomationsState.STARTED,
		};
		return Promise.resolve(null);
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
		policy: PolicyRepoAdapter
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
						policy
					);

				default:
					return null;
			}
		} catch (e) {
			console.warn(
				"Something went wrong trying to spawn an automation",
				maybeTrigger,
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

		// If no existing policy
		if (!policy) return [];

		// Retrieve locker itself so we can get it's address

		const policyApi = policy as PolicyRepoAdapter;
		if (!policyApi.encryptedSessionKey) return [];
		const { automations } = policy;

		const spawnedAutomationsPromises = automations.map((automation) =>
			this.spawnAutomation(maybeTrigger, automation, policyApi)
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
