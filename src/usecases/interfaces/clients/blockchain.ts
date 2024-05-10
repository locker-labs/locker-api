import { IWebhook } from "@moralisweb3/streams-typings";

const zeroAddress = "0x0000000000000000000000000000000000000000";

type Headers = { [key: string]: string | string[] | undefined };

interface IIndexerClient {
	watchOnChain(address: `0x${string}`): Promise<void>;
	verifyWebhook(body: IWebhook, headers: Headers): Promise<void>;
}

export { type Headers, type IIndexerClient, zeroAddress };
