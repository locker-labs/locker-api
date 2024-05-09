import "dotenv/config";

import { plainToClass } from "class-transformer";
import { validate } from "class-validator";
import express, {
	NextFunction,
	Request,
	RequestHandler,
	Response,
} from "express";
import morgan from "morgan";

import {
	getIndexerClient,
	getLockersRepo,
	getTokenTxsRepo,
	stream,
} from "../../../../dependencies";
import { MoralisWebhookRequest } from "../../../../usecases/schemas/tokenTxs";
import InvalidSignature from "../../../clients/errors";
import DuplicateRecordError from "../../../db/errors";

const moralisRouter = express.Router();
moralisRouter.use(express.json());
moralisRouter.use(morgan("combined", { stream }));

function validateRequest<T extends object>(type: {
	new (): T;
}): RequestHandler {
	return async (req: Request, res: Response, next: NextFunction) => {
		const input = plainToClass(type, req.body);
		const errors = await validate(input);
		if (errors.length > 0) {
			res.status(400).json(errors);
		} else {
			req.body = input; // Optionally, replace the req.body with the validated object
			next();
		}
	};
}

moralisRouter.post(
	"/webhooks/transactions",
	validateRequest(MoralisWebhookRequest),
	async (req: Request, res: Response): Promise<void> => {
		// 1. verify webhook
		const providedSignature = req.headers["x-signature"];
		if (!providedSignature)
			res.status(400).send({ error: "Signature not provided." });

		const indexer = await getIndexerClient();

		try {
			await indexer.verifyWebhook(providedSignature as string, req.body);
		} catch (error) {
			if (error instanceof InvalidSignature) {
				res.status(400).send({ error: error.message });
				return;
			}
		}

		// 2. store tx data in database
		if (req.body.txs.length > 0) {
			const lockersRepo = await getLockersRepo();
			const tokenTxsRepo = await getTokenTxsRepo();
			let tokenTx;
			if (req.body.erc20Transfers.length > 0) {
				const locker = await lockersRepo.retrieve({
					address: req.body.erc20Transfers[0].to,
					chainId: parseInt(req.body.chainId, 16),
				});
				tokenTx = {
					lockerId: locker!.id,
					contractAddress: req.body.erc20Transfers[0]
						.contract as `0x${string}`,
					txHash: req.body.erc20Transfers[0].transactionHash,
					fromAddress: req.body.erc20Transfers[0].from,
					toAddress: req.body.erc20Transfers[0].to,
					amount: BigInt(req.body.erc20Transfers[0].value),
					chainId: parseInt(req.body.chainId, 16),
				};
			} else {
				// assume ETH transfer
				const locker = await lockersRepo.retrieve({
					address: req.body.txs[0].toAddress,
					chainId: parseInt(req.body.chainId, 16),
				});
				tokenTx = {
					lockerId: locker!.id,
					contractAddress:
						"0x0000000000000000000000000000000000000000" as `0x${string}`,
					txHash: req.body.txs[0].hash,
					fromAddress: req.body.txs[0].fromAddress,
					toAddress: req.body.txs[0].toAddress,
					amount: BigInt(req.body.txs[0].value),
					chainId: parseInt(req.body.chainId, 16),
				};
			}

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

		res.status(200).send();
	}
);

export default moralisRouter;
