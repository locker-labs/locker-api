import {
	type AuthenticatedRequest,
	authRequired,
} from "../infrastructure/clients/clerk";
import { ClerkAuthClient } from "../infrastructure/clients/clerk";
import EvmClient from "../infrastructure/clients/evm";
import MoralisClient from "../infrastructure/clients/moralis";
import ResendClient from "../infrastructure/clients/resend";
import { IAuthClient } from "../usecases/interfaces/clients/auth";
import IBlockchainClient from "../usecases/interfaces/clients/blockchain";
import IEmailClient from "../usecases/interfaces/clients/email";
import { IIndexerClient } from "../usecases/interfaces/clients/indexer";

// singleton because moralis should only be initialized once
let indexerClient: IIndexerClient | undefined;
async function getIndexerClient(): Promise<IIndexerClient> {
	if (!indexerClient) {
		indexerClient = new MoralisClient();
	}
	return indexerClient;
}

// singleton because moralis should only be initialized once
let emailClient: IEmailClient | undefined;
async function getEmailClient(): Promise<IEmailClient> {
	if (!emailClient) {
		emailClient = new ResendClient();
	}
	return emailClient;
}

// singleton because moralis should only be initialized once
let authClient: IAuthClient | undefined;
async function getAuthClient(): Promise<IAuthClient> {
	if (!authClient) {
		authClient = new ClerkAuthClient();
	}
	return authClient;
}

async function getBlockChainClient(): Promise<IBlockchainClient> {
	return new EvmClient();
}

export {
	type AuthenticatedRequest,
	authRequired,
	getAuthClient,
	getBlockChainClient,
	getEmailClient,
	getIndexerClient,
};
