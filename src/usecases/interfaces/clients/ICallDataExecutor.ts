import { KernelEncodeCallDataArgs } from "@zerodev/sdk/types";

import { PolicyRepoAdapter } from "../../schemas/policies";

interface ICallDataExecutor {
	execCallDataWithPolicy({
		policy,
		callDataArgs,
	}: {
		policy: PolicyRepoAdapter;
		callDataArgs: KernelEncodeCallDataArgs;
	}): Promise<string>;
}

export default ICallDataExecutor;
