import "dotenv/config";

import express, { NextFunction, Request, Response } from "express";
import morgan from "morgan";

import {
	AuthenticatedRequest,
	authRequired,
	getTokenTxsRepo,
	logger,
	stream,
} from "../../../../dependencies";

const tokenTxsRouter = express.Router();
tokenTxsRouter.use(express.json());
tokenTxsRouter.use(morgan("combined", { stream }));

tokenTxsRouter.get(
	"/:lockerId",
	authRequired,
	async (
		req: AuthenticatedRequest<Request>,
		res: Response
	): Promise<void> => {
		const tokenTxsRepo = await getTokenTxsRepo();
		const txs = await tokenTxsRepo.retrieveMany({
			lockerId: parseInt(req.params.lockerId, 10),
		});

		const returnTxs = txs.map((tx) => ({
			...tx,
			amount: tx.amount.toString(),
		}));
		res.status(200).json({ data: returnTxs });
	}
);

// note: needs to be below routes
tokenTxsRouter.use(
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

export default tokenTxsRouter;
