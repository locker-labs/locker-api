import { IWebhook } from "@moralisweb3/streams-typings";

export default interface IIndexerClient {
	watchOnChain(address: `0x${string}`): Promise<void>;

	verifyWebhook(providedSignature: string, body: IWebhook): Promise<void>;
}
