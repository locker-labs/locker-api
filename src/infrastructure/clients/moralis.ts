import { IWebhook } from "@moralisweb3/streams-typings";
import Moralis from "moralis";

import config from "../../config";
import IIndexerClient from "../../usecases/interfaces/clients/blockchain";
import InvalidSignature from "./errors";

export default class MoralisClient implements IIndexerClient {
	constructor() {
		this.startClient();
	}

	async startClient(): Promise<void> {
		await Moralis.start({
			apiKey: config.moralisApiKey,
		});
	}

	async watchOnChain(address: `0x${string}`): Promise<void> {
		await Moralis.Streams.addAddress({
			id: config.moralisStreamId,
			address: [address],
		});
	}

	async verifyWebhook(
		providedSignature: string,
		body: IWebhook
	): Promise<void> {
		try {
			Moralis.Streams.verifySignature({
				body,
				signature: providedSignature,
			});
		} catch (e: unknown) {
			throw new InvalidSignature("The webhook signature is invalid.");
		}
	}
}
