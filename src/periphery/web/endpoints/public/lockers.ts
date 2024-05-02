import "dotenv/config";

import {
	ClerkExpressRequireAuth,
	RequireAuthProp,
	StrictAuthProp,
} from "@clerk/clerk-sdk-node";
import express, { Request, Response } from "express";
import morgan from "morgan";

import { logger, stream } from "../../../../dependencies";

const lockerRouter = express.Router();
lockerRouter.use(express.json());
lockerRouter.use(morgan("combined", { stream }));

declare global {
	/* eslint-disable @typescript-eslint/no-namespace */
	namespace Express {
		// eslint-disable-next-line no-shadow
		interface Request extends StrictAuthProp {}
	}
}

lockerRouter.get(
	"/",
	ClerkExpressRequireAuth(),
	(req: RequireAuthProp<Request>, res: Response) => {
		res.status(200).send({ message: "Hello World." });
	}
);

lockerRouter.use(
	(err: Error, req: RequireAuthProp<Request>, res: Response): void => {
		logger.error(err.stack);
		res.status(401).send("Unauthenticated!");
	}
);

export default lockerRouter;
