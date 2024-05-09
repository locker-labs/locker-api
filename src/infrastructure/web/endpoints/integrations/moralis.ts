import "dotenv/config";

import express, { Request, Response } from "express";
import morgan from "morgan";

import {
	getIndexerClient,
	getTokenTxsRepo,
	getLockersRepo,
	stream,
} from "../../../../dependencies";

import InvalidSignature from "../../../clients/errors";
import DuplicateRecordError from "../../../db/errors";

const moralisRouter = express.Router();
moralisRouter.use(express.json());
moralisRouter.use(morgan("combined", { stream }));

moralisRouter.post(
	"/webhooks/transactions",
	async (req: Request, res: Response): Promise<void> => {
		console.log("header:\n\n", req.headers);

		// 1. verify webhook
		const providedSignature = req.headers["x-signature"];
		if (!providedSignature)
			res.status(400).send({ error: "Signature not provided." });

		const indexer = await getIndexerClient();

		try {
			await indexer.verifyWebhook(providedSignature as string, req.body);
		} catch (error) {
			if (error instanceof InvalidSignature) {
				console.log("we got here");
				res.status(400).send({ error: error.message });
				return;
			}
		}

		if (req.body.txs.length > 0) {
			// 2. store tx data in database
			const lockersRepo = await getLockersRepo();
			const locker = await lockersRepo.retrieve({
				address: req.body.txs[0].toAddress,
				chainId: req.body.chainId,
			});

			const tokenTxsRepo = await getTokenTxsRepo();
			const tokenTx = {
				lockerId: locker!.id,
				contractAddress: req.body.txs[0].toAddress,
				txHash: req.body.txs[0].hash,
				fromAddress: req.body.txs[0].fromAddress,
				toAddress: req.body.txs[0].toAddress,
				amount: parseInt(req.body.txs[0], 10),
				chainId: req.body.chainId,
			};

			try {
				await tokenTxsRepo.create(tokenTx);
			} catch (error) {
				if (error instanceof DuplicateRecordError) {
					res.status(409).send({ error: error.message });
					return;
				}
				res.status(500).send({
					error: "An unexpected error occurred.",
				});
				return;
			}
		}

		console.log("we got here 2");
		res.status(200).send();
	}
);

export default moralisRouter;
