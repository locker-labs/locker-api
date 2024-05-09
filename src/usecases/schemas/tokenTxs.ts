interface TokenTxRepoAdapter {
	lockerId: number;
	contractAddress: `0x${string}`;
	txHash: `0x${string}`;
	fromAddress: `0x${string}`;
	toAddress: `0x${string}`;
	amount: number;
	chainId: number;
}

interface TokenTxInDb extends TokenTxRepoAdapter {
	id: number;
	createdAt: Date;
	updatedAt: Date;
}

export { type TokenTxInDb, type TokenTxRepoAdapter };
