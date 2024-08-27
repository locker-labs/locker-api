import BeamClient from "../infrastructure/clients/beam";
import {
	type AuthenticatedRequest,
	authRequired,
} from "../infrastructure/clients/clerk";
import { ClerkAuthClient } from "../infrastructure/clients/clerk";
import MoralisClient from "../infrastructure/clients/moralis";
import ResendClient from "../infrastructure/clients/resend";
import ZerodevClient from "../infrastructure/clients/zerodev";
import { IAuthClient } from "../usecases/interfaces/clients/auth";
import IEmailClient from "../usecases/interfaces/clients/email";
import IExecutorClient from "../usecases/interfaces/clients/executor";
import { IIndexerClient } from "../usecases/interfaces/clients/indexer";
import IOffRampClient from "../usecases/interfaces/clients/offramp";

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

// It's ok to have multiple instances of executor client.
// This function is for convenience only.
let executorClient: IExecutorClient | undefined;
function getExecutorClient(): IExecutorClient {
	if (!executorClient) {
		executorClient = new ZerodevClient();
	}
	return executorClient;
}

// singleton because moralis should only be initialized once
let authClient: IAuthClient | undefined;
async function getAuthClient(): Promise<IAuthClient> {
	if (!authClient) {
		authClient = new ClerkAuthClient();
	}
	return authClient;
}

let offRampClient: IOffRampClient | undefined;
async function getOffRampClient(): Promise<IOffRampClient> {
	if (!offRampClient) {
		offRampClient = new BeamClient();
	}

	return offRampClient!;
}

export {
	type AuthenticatedRequest,
	authRequired,
	getAuthClient,
	getEmailClient,
	getExecutorClient,
	getIndexerClient,
	getOffRampClient,
};
