import "dotenv/config";

import express, { Request, Response } from "express";
import morgan from "morgan";

import {
	getAuthClient,
	getEmailClient,
	getIndexerClient,
	getLockersRepo,
	getTokenTxsRepo,
	stream,
} from "../../../../dependencies";
import FULLY_SUPPORTED_CHAINS from "../../../../dependencies/chains";
import { zeroAddress } from "../../../../usecases/interfaces/clients/indexer";
import ChainIds from "../../../../usecases/schemas/blockchains";
import {
	ETokenTxAutomationsState,
	ETokenTxLockerDirection,
	TokenTxRepoAdapter,
} from "../../../../usecases/schemas/tokenTxs";
import InvalidSignature from "../../../clients/errors";
import DuplicateRecordError from "../../../db/errors";

const moralisRouter = express.Router();
moralisRouter.use(express.json());
moralisRouter.use(morgan("combined", { stream }));

moralisRouter.post(
	"/webhooks/transactions",
	async (req: Request, res: Response): Promise<void> => {
		console.log("/integrations/moralis/webhooks/transactions");
		console.log(req.body);
		// 1. verify webhook
		const indexer = await getIndexerClient();

		try {
			await indexer.verifyWebhook(req.body, req.headers);
		} catch (error) {
			if (error instanceof InvalidSignature) {
				res.status(400).send({ error: error.message });
				return;
			}
			console.error(
				"Got an unknown error in the webhook verification.",
				error
			);

			res.status(500).send({
				error: "An unexpected error occurred.",
			});

			return;
		}

		try {
			// 2. store tx data in database
			if (req.body.txs.length > 0) {
				const lockersRepo = await getLockersRepo();
				const tokenTxsRepo = await getTokenTxsRepo();
				let tokenTx: TokenTxRepoAdapter;
				let locker;
				if (req.body.erc20Transfers.length > 0) {
					const erc20Tx = req.body.erc20Transfers[0];
					locker = await lockersRepo.retrieve({
						address: erc20Tx.to,
					});
					const lockerDirection =
						erc20Tx.to.toLowerCase() ===
						locker!.address.toLowerCase()
							? ETokenTxLockerDirection.IN
							: ETokenTxLockerDirection.OUT;
					tokenTx = {
						lockerId: locker!.id,
						lockerDirection,
						automationsState: ETokenTxAutomationsState.NOT_STARTED,
						contractAddress: erc20Tx.contract as `0x${string}`,
						txHash: erc20Tx.transactionHash,
						tokenSymbol: erc20Tx.tokenSymbol,
						tokenDecimals: erc20Tx.tokenDecimals,
						fromAddress: erc20Tx.from,
						toAddress: erc20Tx.to,
						isConfirmed: req.body.confirmed,
						amount: BigInt(erc20Tx.value),
						chainId: parseInt(req.body.chainId, 16),
					};
				} else {
					const ethTx = req.body.txs[0];
					const lockerDirection =
						ethTx.toAddress.toLowerCase() ===
						locker!.address.toLowerCase()
							? ETokenTxLockerDirection.IN
							: ETokenTxLockerDirection.OUT;
					// assume ETH transfer
					locker = await lockersRepo.retrieve({
						address: ethTx.toAddress,
					});

					tokenTx = {
						lockerId: locker!.id,
						lockerDirection,
						automationsState: ETokenTxAutomationsState.NOT_STARTED,
						contractAddress: zeroAddress as `0x${string}`,
						txHash: ethTx.hash,
						tokenSymbol:
							FULLY_SUPPORTED_CHAINS[
								parseInt(req.body.chainId, 16) as ChainIds
							].native,
						tokenDecimals: 18,
						fromAddress: ethTx.fromAddress,
						toAddress: ethTx.toAddress,
						isConfirmed: req.body.confirmed,
						amount: BigInt(ethTx.value),
						chainId: parseInt(req.body.chainId, 16),
					};
				}

				try {
					await tokenTxsRepo.create(tokenTx);
				} catch (error) {
					if (error instanceof DuplicateRecordError) {
						res.status(409).send({
							error: (error as Error).message,
						});
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
		} catch (error) {
			// Swallow exceptions to prevent unexpected retry behavior from Moralis
			console.error(
				"Unable to process message from moralis",
				req.body,
				error
			);
		}

		// Saving the txs to the DB triggers webhooks from Supabase
		// to our API at /endpoints/db-hooks/
		// Those webhooks will trigger the automations.

		res.status(200).send();
	}
);

export default moralisRouter;
