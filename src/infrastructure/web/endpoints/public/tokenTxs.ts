import "dotenv/config";

import express, { NextFunction, Request, Response } from "express";
import morgan from "morgan";

import {
	AuthenticatedRequest,
	authRequired,
	getIndexerClient,
	getLockersRepo,
	getTokenTxsRepo,
	logger,
	stream,
} from "../../../../dependencies";
import { ETokenTxLockerDirection } from "../../../../usecases/schemas/tokenTxs";

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
		const lockersRepo = await getLockersRepo();
		const locker = await lockersRepo.retrieve({
			id: parseInt(req.params.lockerId, 10),
		});

		if (!locker) {
			res.status(404).send({ error: "Locker not found." });
			return;
		}

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

tokenTxsRouter.get(
	"/:lockerId/balances",
	authRequired,
	async (
		req: AuthenticatedRequest<Request>,
		res: Response
	): Promise<void> => {
		const lockersRepo = await getLockersRepo();
		const locker = await lockersRepo.retrieve({
			id: parseInt(req.params.lockerId, 10),
		});

		if (!locker) {
			res.status(404).send({ error: "Locker not found." });
			return;
		}

		const { address: lockerAddress } = locker;

		const tokenTxsRepo = await getTokenTxsRepo();
		const txs = await tokenTxsRepo.retrieveMany({
			lockerId: parseInt(req.params.lockerId, 10),
			lockerDirection: ETokenTxLockerDirection.IN,
		});

		const indexerClient = await getIndexerClient();

		const data = await indexerClient.getLockerTokenBalances({
			lockerAddress,
			txs,
		});
		res.status(200).json({ data });
	}
);

tokenTxsRouter.get(
	"/:chainId/:txHash",
	authRequired,
	async (
		req: AuthenticatedRequest<Request>,
		res: Response
	): Promise<void> => {
		const tokenTxsRepo = await getTokenTxsRepo();
		const tx = await tokenTxsRepo.retrieve({
			txHash: req.params.txHash,
			chainId: parseInt(req.params.chainId, 10),
		});

		if (!tx) {
			res.status(404).send({ error: "Token transaction not found." });
			return;
		}

		const returnTx = {
			...tx,
			amount: tx.amount.toString(),
		};

		res.status(200).json({ data: returnTx });
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
