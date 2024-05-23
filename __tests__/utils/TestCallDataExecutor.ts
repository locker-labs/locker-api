import { KernelEncodeCallDataArgs } from "@zerodev/sdk/types";

import ICallDataExecutor from "../../src/usecases/interfaces/clients/ICallDataExecutor";
import { PolicyRepoAdapter } from "../../src/usecases/schemas/policies";

export const DEFAULT_HASH = "0xhash";
export default class TestCallDataExecutor implements ICallDataExecutor {
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
