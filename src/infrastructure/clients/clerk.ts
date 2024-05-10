import {
	ClerkClient,
	ClerkExpressRequireAuth,
	createClerkClient,
	RequireAuthProp,
	StrictAuthProp,
	User,
} from "@clerk/clerk-sdk-node";
import { Request, RequestHandler } from "express";

import config from "../../config";
import { IAuthClient } from "../../usecases/interfaces/clients/auth";

const authRequired: RequestHandler = ClerkExpressRequireAuth();

declare global {
	/* eslint-disable @typescript-eslint/no-namespace */
	namespace Express {
		// eslint-disable-next-line no-shadow
		interface Request extends StrictAuthProp {}
	}
}

type AuthenticatedRequest<T = Request> = RequireAuthProp<T>;

class ClerkAuthClient implements IAuthClient {
	clerk: ClerkClient;

	constructor() {
		this.clerk = createClerkClient({ secretKey: config.clerkSecretkey });
	}

	async getUser(userId: string): Promise<User> {
		return this.clerk.users.getUser(userId);
	}
}

export { type AuthenticatedRequest, authRequired, ClerkAuthClient };
