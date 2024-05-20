import { privateKeyToAccount } from "viem/accounts";

export type ITransactionProps = {
	to: `0x${string}`;
	value: number;
	// callType: "delegatecall",
	data: string;
};

export const execTxWithSessionKey = async () => {
	const sessionKeyRawAccount = privateKeyToAccount(
		process.env.SIGNER_PRIVATE_KEY! as `0x${string}`
	);
};
