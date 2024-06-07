import "dotenv/config";

import express, { Request, Response } from "express";
import morgan from "morgan";

import {
	// getAuthClient,
	// getEmailClient,
	getIndexerClient,
	getLockersRepo,
	getTokenTxsRepo,
	logger,
	stream,
} from "../../../../dependencies";
import SUPPORTED_CHAINS from "../../../../dependencies/chains";
import { zeroAddress } from "../../../../usecases/interfaces/clients/indexer";
import ILockersRepo from "../../../../usecases/interfaces/repos/lockers";
import ChainIds from "../../../../usecases/schemas/blockchains";
import { LockerInDb } from "../../../../usecases/schemas/lockers";
import {
	ETokenTxAutomationsState,
	ETokenTxLockerDirection,
	TokenTxRepoAdapter,
} from "../../../../usecases/schemas/tokenTxs";
// import InvalidSignature from "../../../clients/errors";
import DuplicateRecordError from "../../../db/errors";

const moralisRouter = express.Router();
moralisRouter.use(express.json());
moralisRouter.use(morgan("combined", { stream }));

export const adaptMoralisBody2TokenTx = async (
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	moralisBody: any,
	lockersRepo: ILockersRepo
): Promise<{ tokenTx: TokenTxRepoAdapter; locker: LockerInDb }> => {
	const { erc20Transfers, txs } = moralisBody;
	let locker;
	let tokenTx;

	if (erc20Transfers.length > 0) {
		const erc20Tx = erc20Transfers[0];

		locker = await lockersRepo.retrieve({
			address: erc20Tx.to,
		});
		if (!locker) throw new Error(`Locker not found ${erc20Tx.toAddress}`);

		const isRecipientLocker =
			erc20Tx.to.toLowerCase() === locker!.address.toLowerCase();
		const lockerDirection = isRecipientLocker
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
			isConfirmed: moralisBody.confirmed,
			amount: BigInt(erc20Tx.value),
			chainId: parseInt(moralisBody.chainId, 16),
		};
	} else {
		const ethTx = txs[0];
		const { toAddress, fromAddress, value, hash } = ethTx;

		// assume ETH transfer
		let lockerDirection = ETokenTxLockerDirection.IN;
		locker = await lockersRepo.retrieve({
			address: toAddress,
		});

		if (!locker) {
			locker = await lockersRepo.retrieve({
				address: fromAddress,
			});
			lockerDirection = ETokenTxLockerDirection.OUT;
		}

		if (!locker)
			throw new Error(
				`Locker not found ${toAddress} as sender or recipient of transaction.`
			);

		tokenTx = {
			lockerId: locker!.id,
			lockerDirection,
			automationsState: ETokenTxAutomationsState.NOT_STARTED,
			contractAddress: zeroAddress as `0x${string}`,
			txHash: hash,
			tokenSymbol:
				SUPPORTED_CHAINS[parseInt(moralisBody.chainId, 16) as ChainIds]
					.native,
			tokenDecimals: 18,
			fromAddress: fromAddress.toLowerCase(),
			toAddress: toAddress.toLowerCase(),
			isConfirmed: moralisBody.confirmed,
			amount: BigInt(value),
			chainId: parseInt(moralisBody.chainId, 16),
		};
	}

	return { tokenTx, locker };
};

moralisRouter.post(
	"/webhooks/transactions",
	async (req: Request, res: Response): Promise<void> => {
		const { body: moralisBody } = req;
		const { txs } = moralisBody;

		try {
			// 1. verify webhook
			const indexer = await getIndexerClient();

			console.log("Received Moralis webhook");
			console.log(JSON.stringify(moralisBody, null, 2));

			// try {
			// 	await indexer.verifyWebhook(moralisBody, req.headers);
			// } catch (error) {
			// 	if (error instanceof InvalidSignature) {
			// 		res.status(400).send({ error: error.message });
			// 		return;
			// 	}

			// 	res.status(500).send({
			// 		error: "An unexpected error occurred.",
			// 	});

			// 	return;
			// }

			// 2. store tx data in database
			if (txs.length > 0) {
				const tokenTxsRepo = await getTokenTxsRepo();
				const lockersRepo = await getLockersRepo();
				const { tokenTx, locker } = await adaptMoralisBody2TokenTx(
					moralisBody,
					lockersRepo
				);

				try {
					await tokenTxsRepo.create(tokenTx);
				} catch (error) {
					if (error instanceof DuplicateRecordError) {
						res.status(409).send({
							error: (error as Error).message,
						});
						return;
					}
					logger.error("Error creating token tx", error);
					res.status(500).send({
						error: "An unexpected error occurred.",
					});
					return;
				}

				// 3. Send email
				// const authClient = await getAuthClient();
				// const user = await authClient.getUser(locker!.userId);

				// const emailClient = await getEmailClient();
				// await emailClient.send(
				// 	user.emailAddresses[0].emailAddress,
				// 	tokenTx,
				// 	moralisBody.confirmed
				// );
			}
		} catch (error) {
			// Swallow exceptions to prevent unexpected retry behavior from Moralis
			logger.error("Unable to process message from moralis", moralisBody);
		}

		// Saving the txs to the DB triggers webhooks from Supabase
		// to our API at /endpoints/db-hooks/
		// Those webhooks will trigger the automations.

		res.status(200).send();
	}
);

export default moralisRouter;
