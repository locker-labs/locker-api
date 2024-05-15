import "dotenv/config";

import express, { Request, Response } from "express";
import morgan from "morgan";

import {
	getAuthClient,
	getBlockChainClient,
	getEmailClient,
	getIndexerClient,
	getLockersRepo,
	getTokenTxsRepo,
	stream,
} from "../../../../dependencies";
import SUPPORTED_CHAINS from "../../../../dependencies/chains";
import { zeroAddress } from "../../../../usecases/interfaces/clients/indexer";
import ChainIds from "../../../../usecases/schemas/blockchains";
import InvalidSignature from "../../../clients/errors";
import DuplicateRecordError from "../../../db/errors";

const moralisRouter = express.Router();
moralisRouter.use(express.json());
moralisRouter.use(morgan("combined", { stream }));

moralisRouter.post(
	"/webhooks/transactions",
	async (req: Request, res: Response): Promise<void> => {
		// 1. verify webhook
		const indexer = await getIndexerClient();

		try {
			await indexer.verifyWebhook(req.body, req.headers);
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
			let locker;
			if (req.body.erc20Transfers.length > 0) {
				locker = await lockersRepo.retrieve({
					address: req.body.erc20Transfers[0].to,
				});
				tokenTx = {
					lockerId: locker!.id,
					contractAddress: req.body.erc20Transfers[0]
						.contract as `0x${string}`,
					txHash: req.body.erc20Transfers[0].transactionHash,
					tokenSymbol: req.body.erc20Transfers[0].tokenSymbol,
					tokenDecimals: req.body.erc20Transfers[0].tokenDecimals,
					fromAddress: req.body.erc20Transfers[0].from,
					toAddress: req.body.erc20Transfers[0].to,
					isConfirmed: req.body.confirmed,
					amount: BigInt(req.body.erc20Transfers[0].value),
					chainId: parseInt(req.body.chainId, 16),
				};
			} else {
				// assume ETH transfer
				locker = await lockersRepo.retrieve({
					address: req.body.txs[0].toAddress,
				});

				tokenTx = {
					lockerId: locker!.id,
					contractAddress: zeroAddress as `0x${string}`,
					txHash: req.body.txs[0].hash,
					tokenSymbol:
						SUPPORTED_CHAINS[
							parseInt(req.body.chainId, 16) as ChainIds
						].native,
					tokenDecimals: 18,
					fromAddress: req.body.txs[0].fromAddress,
					toAddress: req.body.txs[0].toAddress,
					isConfirmed: req.body.confirmed,
					amount: BigInt(req.body.txs[0].value),
					chainId: parseInt(req.body.chainId, 16),
				};
			}

			try {
				await tokenTxsRepo.create(tokenTx);
			} catch (error) {
				if (error instanceof DuplicateRecordError) {
					res.status(409).send({ error: (error as Error).message });
					return;
				}
				res.status(500).send({
					error: "An unexpected error occurred.",
				});
				return;
			}

			// 3. Send email
			const authClient = await getAuthClient();
			const user = await authClient.getUser(locker!.userId);

			const emailClient = await getEmailClient();
			await emailClient.send(
				user.emailAddresses[0].emailAddress,
				tokenTx,
				req.body.confirmed
			);
		}

		// 4. Allocate funds for user
		const blockchainClient = await getBlockChainClient();
		await blockchainClient.sendTransaction();

		res.status(200).send();
	}
);

export default moralisRouter;
