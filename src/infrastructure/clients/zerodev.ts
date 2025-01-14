// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck

import { getKernelAddressFromECDSA } from "@zerodev/ecdsa-validator";
import { deserializePermissionAccount } from "@zerodev/permissions";
import { toECDSASigner } from "@zerodev/permissions/signers";
import {
	createKernelAccountClient,
	createZeroDevPaymasterClient,
	getCustomNonceKeyFromString,
	getUserOperationGasPrice,
} from "@zerodev/sdk";
import { getEntryPoint, KERNEL_V3_1 } from "@zerodev/sdk/constants";
import { KernelEncodeCallDataArgs } from "@zerodev/sdk/types";
import { createPublicClient, http, pad, type PublicClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";

import config from "../../config";
import SUPPORTED_CHAINS from "../../dependencies/chains";
import IExecutorClient from "../../usecases/interfaces/clients/executor";
import { PolicyRepoAdapter } from "../../usecases/schemas/policies";
import { decrypt } from "../../usecases/services/encryption";

const entryPoint = getEntryPoint("0.7");

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
			entryPoint,
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
		const { chainId, encryptedSessionKey, encodedIv } = policy;

		// Create signer from locker agent
		const sessionKeyRawAccount = privateKeyToAccount(
			config.lockerAgentPrivateKey
		);
		const sessionKeySigner = await toECDSASigner({
			signer: sessionKeyRawAccount,
		});
		const { bundlerRpcUrl, paymasterRpcUrl } = SUPPORTED_CHAINS[chainId];
		const chain = SUPPORTED_CHAINS[chainId].viemChain;
		const publicClient = createPublicClient({
			transport: http(bundlerRpcUrl),
			chain,
		});

		// Decrypt policy
		const serializedSessionKey = decrypt(encryptedSessionKey, encodedIv);
		// console.log("Using session key");
		// console.log(serializedSessionKey);
		const sessionKeyAccount = await deserializePermissionAccount(
			publicClient,
			entryPoint,
			KERNEL_V3_1,
			serializedSessionKey,
			sessionKeySigner
		);

		// Construct user op and paymaster
		const kernelPaymaster = createZeroDevPaymasterClient({
			chain,
			transport: http(paymasterRpcUrl),
		});
		const kernelClient = createKernelAccountClient({
			account: sessionKeyAccount,
			chain,
			bundlerTransport: http(bundlerRpcUrl),
			client: publicClient,
			paymaster: {
				getPaymasterData(userOperation) {
					return kernelPaymaster.sponsorUserOperation({
						userOperation,
					});
				},
			},
			userOperation: {
				estimateFeesPerGas: async ({ bundlerClient }) =>
					getUserOperationGasPrice(bundlerClient),
			},
		});

		const nonceKey = getCustomNonceKeyFromString(scope, entryPoint.version);
		const nonce = await kernelClient.account.getNonce({ key: nonceKey });
		console.log("Nonce", nonce, scope, nonceKey);

		const isEthTransfer = callDataArgs.data === pad("0x", { size: 4 });

		// Send ETH transfer
		if (isEthTransfer) {
			console.log("Going to send ETH transfer", callDataArgs);
			const { to, value } = callDataArgs;

			const txHash = await kernelClient.sendTransaction({
				calls: [
					{
						to,
						value,
						// data: "0x00000000" as `0x${string}`,
						// FIXME `AA25 invalid account nonce` when included
						// nonce: Number(nonce),
					},
				],
			});

			console.log("ETH transfer", txHash);

			return txHash;
		}

		// Otherwise is ER20
		// Send user operation
		console.log("Going to send ERC20 transfer", callDataArgs);
		const callData = await sessionKeyAccount.encodeCalls([callDataArgs]);
		const userOpHash = await kernelClient.sendUserOperation({
			callData,
			nonce,
		});

		console.log("Waiting for user operation receipt", userOpHash);
		const txReceipt = await kernelClient.waitForUserOperationReceipt({
			hash: userOpHash,
		});
		console.log("User operation receipt", txReceipt);

		return txReceipt.receipt.transactionHash;
	}
}
