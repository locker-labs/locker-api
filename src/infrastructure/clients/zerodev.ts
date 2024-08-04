import { getKernelAddressFromECDSA } from "@zerodev/ecdsa-validator";
import { deserializePermissionAccount } from "@zerodev/permissions";
import { toECDSASigner } from "@zerodev/permissions/signers";
import {
	createKernelAccountClient,
	createZeroDevPaymasterClient,
	getCustomNonceKeyFromString,
} from "@zerodev/sdk";
import { KERNEL_V3_1 } from "@zerodev/sdk/constants";
import { CallType, KernelEncodeCallDataArgs } from "@zerodev/sdk/types";
import { bundlerActions, ENTRYPOINT_ADDRESS_V07 } from "permissionless";
import {
	Address,
	createPublicClient,
	Hex,
	http,
	type PublicClient,
} from "viem";
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
			kernelVersion: KERNEL_V3_1,
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
		scope,
	}: {
		policy: PolicyRepoAdapter;
		callDataArgs: KernelEncodeCallDataArgs;
		scope: string;
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
		// console.log("Using session key");
		// console.log(serializedSessionKey);
		const sessionKeyAccount = await deserializePermissionAccount(
			publicClient,
			entryPoint,
			KERNEL_V3_1,
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

		const nonceKey = getCustomNonceKeyFromString(scope, entryPoint);
		const nonce = await sessionKeyAccount.getNonce(nonceKey);

		const isEthTransfer = true;

		// Send ETH transfer
		if (isEthTransfer) {
			const { to, value, data } = callDataArgs as {
				to: Address;
				value: bigint;
				data: Hex;
				callType: CallType;
			};
			const txHash = await kernelClient.sendTransaction({
				to,
				value,
				data,
				// FIXME `AA25 invalid account nonce` when included
				// nonce: Number(nonce),
			});

			return txHash;
		}

		// Otherwise is ER20
		// Send user operation
		const callData = await sessionKeyAccount.encodeCallData(callDataArgs);
		const userOpHash = await kernelClient.sendUserOperation({
			userOperation: {
				callData,
				nonce,
			},
		});

		// Wait for transaction
		const bundlerClient = kernelClient.extend(
			bundlerActions(ENTRYPOINT_ADDRESS_V07)
		);
		console.log("Waiting for user operation receipt", userOpHash);
		const txReceipt = await bundlerClient.waitForUserOperationReceipt({
			hash: userOpHash,
		});
		console.log("User operation receipt", txReceipt);

		return txReceipt.receipt.transactionHash;
	}
}
