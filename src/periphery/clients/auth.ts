import {
	ClerkExpressRequireAuth,
	RequireAuthProp,
	StrictAuthProp,
} from "@clerk/clerk-sdk-node";
import { Request, RequestHandler } from "express";

export const authRequired: RequestHandler = ClerkExpressRequireAuth();

declare global {
	/* eslint-disable @typescript-eslint/no-namespace */
	namespace Express {
		// eslint-disable-next-line no-shadow
		interface Request extends StrictAuthProp {}
	}
}

export type AuthenticatedRequest<T = Request> = RequireAuthProp<T>;
