import "dotenv/config";

import express, { NextFunction, Request, Response } from "express";
import morgan from "morgan";

import {
	AuthenticatedRequest,
	authRequired,
	logger,
	stream,
} from "../../../../dependencies";

const lockerRouter = express.Router();
lockerRouter.use(express.json());
lockerRouter.use(morgan("combined", { stream }));

lockerRouter.get(
	"/",
	authRequired,
	(req: AuthenticatedRequest<Request>, res: Response): void => {
		res.status(200).send({ message: "Hello World." });
	}
);

lockerRouter.use(
	(
		err: Error,
		req: AuthenticatedRequest<Request>,
		res: Response,
		next: NextFunction
	): void => {
		logger.error(err.stack);
		res.status(401).send("Unauthenticated!");
		next();
	}
);

export default lockerRouter;
