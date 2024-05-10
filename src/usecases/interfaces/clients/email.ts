import { TokenTx } from "../../schemas/tokenTxs";

export default interface IEmailClient {
	send(email: string, tx: TokenTx): Promise<void>;
}
