import { deserializePermissionAccount } from "@zerodev/permissions";
import { toECDSASigner } from "@zerodev/permissions/signers";
import { ENTRYPOINT_ADDRESS_V07 } from "permissionless";
import { createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";

import FULLY_SUPPORTED_CHAINS from "../../dependencies/chains";

export type ITransactionProps = {
	to: `0x${string}`;
	value: number;
	// callType: "delegatecall",
	data: string;
};

const ENTRY_POINT = ENTRYPOINT_ADDRESS_V07;

export const execTxWithSessionKey = async (chainId: number) => {
	const sessionKeyRawAccount = privateKeyToAccount(
		process.env.LOCKER_AGENT_PRIVATE_KEY! as `0x${string}`
	);

	const sessionKeySigner = await toECDSASigner({
		signer: sessionKeyRawAccount,
	});

	const { bundlerRpcUrl, paymasterRpcUrl } = FULLY_SUPPORTED_CHAINS[chainId];
	const publicClient = createPublicClient({
		transport: http(bundlerRpcUrl),
	});

	const sessionKeyAccount = await deserializePermissionAccount(
		publicClient,
		ENTRY_POINT,
		serializedSessionKey,
		sessionKeySigner
	);
};
