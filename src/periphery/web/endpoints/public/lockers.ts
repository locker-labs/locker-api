import "dotenv/config";
import express, { Request, Response } from "express";
import morgan from "morgan";
import {
	ClerkExpressRequireAuth,
	RequireAuthProp,
	StrictAuthProp,
} from "@clerk/clerk-sdk-node";

import { logger, stream } from "../../../../dependencies";

const lockerRouter = express.Router();
lockerRouter.use(express.json());
lockerRouter.use(morgan("combined", { stream }));

declare global {
	namespace Express {
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
