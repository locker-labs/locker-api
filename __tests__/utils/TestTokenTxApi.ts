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
			...tokenTx,
			id: 1,
			createdAt: new Date(),
			updatedAt: new Date(),
			// lockerDirection: ETokenTxLockerDirection.OUT,
			// automationsState: ETokenTxAutomationsState.NOT_STARTED,
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
