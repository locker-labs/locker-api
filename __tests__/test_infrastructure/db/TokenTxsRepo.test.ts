import { logger } from "../../../src/dependencies";
import { genRanHex } from "../../../src/dependencies/environment";
import getOrCreateDatabase from "../../../src/infrastructure/db/connect";
import TokenTxsRepo from "../../../src/infrastructure/db/repos/tokenTxs";
import {
	ETokenTxAutomationsState,
	ETokenTxLockerDirection,
	TokenTxRepoAdapter,
} from "../../../src/usecases/schemas/tokenTxs";

describe.skip("TokenTxsRepo", () => {
	it("create does not override completion", async () => {
		const txHash = `0x${genRanHex(64)}` as `0x${string}`;
		console.log(txHash);
		const confirmedTx: TokenTxRepoAdapter = {
			amount: "1000",
			txHash,
			chainId: 11155111,
			lockerId: 1,
			toAddress: "0xTOADDRESS",
			fromAddress: "0xaf115955b028c145ce3a7367b25a274723c5104b",
			isConfirmed: true,
			tokenSymbol: "USDC",
			tokenDecimals: 6,
			contractAddress: "0x1c7d4b196cb07b01d743fbc6116a902379c7238",
			lockerDirection: ETokenTxLockerDirection.IN,
			automationsState: ETokenTxAutomationsState.NOT_STARTED,
		};

		// first create tx as confirmed
		const db = getOrCreateDatabase(logger);
		const tokenTxDb = new TokenTxsRepo(db);
		const { id, isConfirmed } = await tokenTxDb.create(confirmedTx);
		expect(id).toBeDefined();
		expect(isConfirmed).toBe(true);

		// then process unconfirmed
		const unconfirmedTx: TokenTxRepoAdapter = {
			amount: "1000",
			txHash,
			chainId: 11155111,
			lockerId: 1,
			toAddress: "0xTOADDRESS",
			fromAddress: "0xaf115955b028c145ce3a7367b25a274723c5104b",
			isConfirmed: false,
			tokenSymbol: "USDC",
			tokenDecimals: 6,
			contractAddress: "0x1c7d4b196cb07b01d743fbc6116a902379c7238",
			lockerDirection: ETokenTxLockerDirection.IN,
			automationsState: ETokenTxAutomationsState.NOT_STARTED,
		};
		const updatedTx = await tokenTxDb.create(unconfirmedTx);
		console.log("updatedTx");
		console.log(updatedTx);

		// check that the tx is still confirmed
		expect(updatedTx).toBeUndefined();
		const tx = await tokenTxDb.retrieve({ id });
		expect(tx?.isConfirmed).toBe(true);
	});

	it("create does override pending", async () => {
		const txHash = `0x${genRanHex(64)}` as `0x${string}`;
		console.log(txHash);
		const confirmedTx: TokenTxRepoAdapter = {
			amount: "1000",
			txHash,
			chainId: 11155111,
			lockerId: 1,
			toAddress: "0xTOADDRESS",
			fromAddress: "0xaf115955b028c145ce3a7367b25a274723c5104b",
			isConfirmed: false,
			tokenSymbol: "USDC",
			tokenDecimals: 6,
			contractAddress: "0x1c7d4b196cb07b01d743fbc6116a902379c7238",
			lockerDirection: ETokenTxLockerDirection.IN,
			automationsState: ETokenTxAutomationsState.NOT_STARTED,
		};

		// first create tx as confirmed
		const db = getOrCreateDatabase(logger);
		const tokenTxDb = new TokenTxsRepo(db);
		const { id, isConfirmed } = await tokenTxDb.create(confirmedTx);
		expect(id).toBeDefined();
		expect(isConfirmed).toBe(false);

		// then process unconfirmed
		const unconfirmedTx: TokenTxRepoAdapter = {
			amount: "1000",
			txHash,
			chainId: 11155111,
			lockerId: 1,
			toAddress: "0xTOADDRESS",
			fromAddress: "0xaf115955b028c145ce3a7367b25a274723c5104b",
			isConfirmed: true,
			tokenSymbol: "USDC",
			tokenDecimals: 6,
			contractAddress: "0x1c7d4b196cb07b01d743fbc6116a902379c7238",
			lockerDirection: ETokenTxLockerDirection.IN,
			automationsState: ETokenTxAutomationsState.NOT_STARTED,
		};
		const { id: updatedId } = await tokenTxDb.create(unconfirmedTx);

		// check that the tx is still confirmed
		expect(updatedId).toBe(id);
		const tx = await tokenTxDb.retrieve({ id });
		expect(tx?.isConfirmed).toBe(true);
	});
});
