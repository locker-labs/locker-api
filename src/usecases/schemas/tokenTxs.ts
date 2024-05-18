/* eslint-disable max-classes-per-file */

interface TokenTxRepoAdapter {
	lockerId: number;
	contractAddress: `0x${string}`;
	txHash: `0x${string}`;
	tokenSymbol: string;
	fromAddress: `0x${string}`;
	toAddress: `0x${string}`;
	tokenDecimals: number;
	isConfirmed: boolean;
	amount: bigint;
	chainId: number;
}

interface TokenTx extends TokenTxRepoAdapter {}

interface TokenTxInDb extends TokenTxRepoAdapter {
	id: number;
	createdAt: Date;
	updatedAt: Date;
}

enum ETokenTxLockerDirection {
	IN = "in",
	OUT = "out",
}

enum ETokenTxAutomationsState {
	NOT_STARTED = "not_started",
	STARTED = "started",
}

export {
	ETokenTxAutomationsState,
	ETokenTxLockerDirection,
	type TokenTx,
	type TokenTxInDb,
	type TokenTxRepoAdapter,
};
