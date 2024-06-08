import { KernelEncodeCallDataArgs } from "@zerodev/sdk/types";

import IExecutorClient from "../../src/usecases/interfaces/clients/executor";
import { PolicyRepoAdapter } from "../../src/usecases/schemas/policies";

export const DEFAULT_HASH = "0xhash";
export default class TestCallDataExecutor implements IExecutorClient {
	getKernelAddress({
		seed,
		eoaAddress,
		chainId,
	}: {
		seed: number;
		eoaAddress: `0x${string}`;
		chainId: number;
	}): Promise<`0x${string}`> {
		throw new Error("Method not implemented.");
	}
	enablePaymaster({
		addressToSponsor,
	}: {
		chainId: number;
		addressToSponsor: `0x${string}`;
	}): Promise<void> {
		throw new Error("Method not implemented.");
	}
	execCallDataWithPolicy({
		policy,
		callDataArgs,
	}: {
		policy: PolicyRepoAdapter;
		callDataArgs: KernelEncodeCallDataArgs;
	}): Promise<string> {
		return Promise.resolve(DEFAULT_HASH);
	}
}
