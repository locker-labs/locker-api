import { KernelEncodeCallDataArgs } from "@zerodev/sdk/types";

import { PolicyRepoAdapter } from "../../schemas/policies";

interface IExecutorClient {
	getKernelAddress({
		seed,
		eoaAddress,
		chainId,
	}: {
		seed: number;
		eoaAddress: `0x${string}`;
		chainId: number;
	}): Promise<`0x${string}`>;

	execCallDataWithPolicy({
		policy,
		callDataArgs,
	}: {
		policy: PolicyRepoAdapter;
		callDataArgs: KernelEncodeCallDataArgs;
	}): Promise<string>;

	/**
	 * Enables a paymaster that will sponsor all transactions for a given address.
	 * Currently, this address will always correspond to a locker.
	 * @param param0
	 */
	enablePaymaster({
		addressToSponsor,
	}: {
		chainId: number;
		addressToSponsor: `0x${string}`;
	}): Promise<void>;
}

export default IExecutorClient;
