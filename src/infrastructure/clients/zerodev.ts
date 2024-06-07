import { getKernelAddressFromECDSA } from "@zerodev/ecdsa-validator";
import { deserializePermissionAccount } from "@zerodev/permissions";
import { toECDSASigner } from "@zerodev/permissions/signers";
import {
	createKernelAccountClient,
	createZeroDevPaymasterClient,
} from "@zerodev/sdk";
import { KernelEncodeCallDataArgs } from "@zerodev/sdk/types";
import { ENTRYPOINT_ADDRESS_V07 } from "permissionless";
import { createPublicClient, http, type PublicClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";

import config from "../../config";
import SUPPORTED_CHAINS from "../../dependencies/chains";
import IExecutorClient from "../../usecases/interfaces/clients/executor";
import { PolicyRepoAdapter } from "../../usecases/schemas/policies";
import { decrypt } from "../../usecases/services/encryption";

export default class ZerodevClient implements IExecutorClient {
	getPublicClient(chainId: number): PublicClient {
		const { bundlerRpcUrl } = SUPPORTED_CHAINS[chainId];
		const publicClient = createPublicClient({
			transport: http(bundlerRpcUrl),
		});

		if (!publicClient) {
			throw new Error("Public client not found");
		}

		return publicClient;
	}

	async getKernelAddress({
		seed,
		eoaAddress,
		chainId,
	}: {
		seed: number;
		eoaAddress: `0x${string}`;
		chainId: number;
	}): Promise<`0x${string}`> {
		const publicClient = this.getPublicClient(chainId);
		const kernelAddress = await getKernelAddressFromECDSA({
			publicClient,
			eoaAddress,
			index: BigInt(seed),
			entryPointAddress: ENTRYPOINT_ADDRESS_V07,
		});

		return kernelAddress;
	}

	async enablePaymaster({
		chainId,
		addressToSponsor,
	}: {
		chainId: number;
		addressToSponsor: `0x${string}`;
	}): Promise<void> {
		const projectId = SUPPORTED_CHAINS[chainId].zerodevProjectId;
		const url = `https://prod-api.zerodev.app/projects/${projectId}/policies`;
		const headers = {
			Accept: "application/json",
			"Content-Type": "application/json",
			"X-API-KEY": process.env.ZERODEV_API_KEY!,
		};

		const data = {
			strategy: "pay_for_user",
			policyGroup: "wallet",
			addresses: [addressToSponsor],
		};

		await fetch(url, {
			method: "POST",
			headers,
			body: JSON.stringify(data),
		}).then((response) => response.json());
	}

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
			config.lockerAgentPrivateKey
		);
		const sessionKeySigner = await toECDSASigner({
			signer: sessionKeyRawAccount,
		});
		const { bundlerRpcUrl, paymasterRpcUrl } = SUPPORTED_CHAINS[chainId];
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
		const chain = SUPPORTED_CHAINS[chainId].viemChain;

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
