import { TokenTxInDb, TokenTxRepoAdapter } from "../../schemas/tokenTxs";

export default interface ITokenTxsRepo {
	create(locker: TokenTxRepoAdapter): Promise<TokenTxInDb>;
	retrieve(options: {
		id?: number;
		txHash?: string;
		chainId?: number;
	}): Promise<TokenTxInDb | null>;
	retrieveMany(options: {
		lockerId: number;
		chainId?: number;
	}): Promise<TokenTxInDb[]>;
}
