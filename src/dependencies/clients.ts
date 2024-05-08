import {
	type AuthenticatedRequest,
	authRequired,
} from "../infrastructure/clients/auth";
import BlockchainClient from "../infrastructure/clients/moralis";
import IIndexerClient from "../usecases/interfaces/clients/blockchain";

let client: IIndexerClient | undefined;

// singleton because moralis should only be initialized once
async function getIndexerClient(): Promise<IIndexerClient> {
	if (!client) {
		client = new BlockchainClient();
	}
	return client;
}

export { type AuthenticatedRequest, authRequired, getIndexerClient };
