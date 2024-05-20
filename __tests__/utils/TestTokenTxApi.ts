import ITokenTxsRepo from "../../src/usecases/interfaces/repos/tokenTxs";
import {
	ETokenTxAutomationsState,
	ETokenTxLockerDirection,
	TokenTxInDb,
	TokenTxRepoAdapter,
} from "../../src/usecases/schemas/tokenTxs";

export default class TestTokenTxApi implements ITokenTxsRepo {
	create(tokenTx: TokenTxRepoAdapter): Promise<TokenTxInDb> {
		// throw new Error("Method not implemented.");
		return Promise.resolve({
			id: 1,
			createdAt: new Date(),
			updatedAt: new Date(),
			lockerId: 123,
			lockerDirection: ETokenTxLockerDirection.OUT,
			automationsState: ETokenTxAutomationsState.NOT_STARTED,
			contractAddress: "0x456",
			txHash: "0x789",
			tokenSymbol: "FOO",
			fromAddress: "0xabc",
			toAddress: "0xdef",
			tokenDecimals: 18,
			isConfirmed: true,
			amount: BigInt(1000),
			chainId: 1,
			encryptedSessionKey: "test",
		});
	}

	retrieve(options: {
		id?: number | undefined;
		txHash?: string | undefined;
		chainId?: number | undefined;
	}): Promise<TokenTxInDb | null> {
		throw new Error("Method not implemented.");
	}

	retrieveMany(options: { lockerId: number }): Promise<TokenTxInDb[]> {
		throw new Error("Method not implemented.");
	}
}
