import { TokenTx } from "../../schemas/tokenTxs";

export default interface IEmailClient {
	send(email: string, tx: TokenTx, isConfirmed: boolean): Promise<void>;
}
