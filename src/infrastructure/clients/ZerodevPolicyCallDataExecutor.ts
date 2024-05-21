import { deserializePermissionAccount } from "@zerodev/permissions";
import { toECDSASigner } from "@zerodev/permissions/signers";
import {
	createKernelAccountClient,
	createZeroDevPaymasterClient,
} from "@zerodev/sdk";
import { KernelEncodeCallDataArgs } from "@zerodev/sdk/types";
import { decrypt } from "dotenv";
import { ENTRYPOINT_ADDRESS_V07 } from "permissionless";
import { createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";

import FULLY_SUPPORTED_CHAINS from "../../dependencies/chains";
import ICallDataExecutor from "../../usecases/interfaces/clients/ICallDataExecutor";
import { PolicyRepoAdapter } from "../../usecases/schemas/policies";
import { chainId2ViemChain } from "../utils/viem";

export default class ZerodevPolicyCallDataExecutor
	implements ICallDataExecutor
{
	async execCallDataWithPolicy({
		policy,
		callDataArgs,
	}: {
		policy: PolicyRepoAdapter;
		callDataArgs: KernelEncodeCallDataArgs;
	}): Promise<string> {
		const entryPoint = ENTRYPOINT_ADDRESS_V07;
		const { chainId } = policy;

		// Create signer from locker agent
		const sessionKeyRawAccount = privateKeyToAccount(
			process.env.LOCKER_AGENT_PRIVATE_KEY! as `0x${string}`
		);
		const sessionKeySigner = await toECDSASigner({
			signer: sessionKeyRawAccount,
		});
		const { bundlerRpcUrl, paymasterRpcUrl } =
			FULLY_SUPPORTED_CHAINS[chainId];
		const publicClient = createPublicClient({
			transport: http(bundlerRpcUrl),
		});

		// Decrypt policy
		const serializedSessionKey = decrypt(
			policy.encryptedSessionKey,
			policy.encodedIv
		);
		const sessionKeyAccount = await deserializePermissionAccount(
			publicClient,
			entryPoint,
			serializedSessionKey,
			sessionKeySigner
		);
		const chain = chainId2ViemChain(chainId);

		// Construct user op and paymaster
		const kernelPaymaster = createZeroDevPaymasterClient({
			entryPoint,
			chain,
			transport: http(paymasterRpcUrl),
		});
		const kernelClient = createKernelAccountClient({
			entryPoint,
			account: sessionKeyAccount,
			chain,
			bundlerTransport: http(bundlerRpcUrl),
			middleware: {
				sponsorUserOperation: kernelPaymaster.sponsorUserOperation,
			},
		});

		// Send user operation
		const userOpHash = await kernelClient.sendUserOperation({
			userOperation: {
				callData: await sessionKeyAccount.encodeCallData(callDataArgs),
			},
		});

		return userOpHash;
	}
}
