import "dotenv/config";

import express, { Request, Response } from "express";
import morgan from "morgan";

import {
	getAuthClient,
	getEmailClient,
	getIndexerClient,
	getLockersRepo,
	getTokenTxsRepo,
	logger,
	stream,
} from "../../../../dependencies";
import SUPPORTED_CHAINS from "../../../../dependencies/chains";
import { isTestEnv } from "../../../../dependencies/environment";
import { zeroAddress } from "../../../../usecases/interfaces/clients/indexer";
import ILockersRepo from "../../../../usecases/interfaces/repos/lockers";
import ChainIds from "../../../../usecases/schemas/blockchains";
import { LockerInDb } from "../../../../usecases/schemas/lockers";
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

export const adaptMoralisBody2TokenTx = async (
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	moralisBody: any,
	lockersRepo: ILockersRepo
): Promise<{ tokenTx: TokenTxRepoAdapter; locker: LockerInDb }> => {
	const { erc20Transfers, txs, txsInternal } = moralisBody;
	let locker;
	let tokenTx;

	if (erc20Transfers.length > 0) {
		const erc20Tx = erc20Transfers[0];
		const {
			from,
			to,
			transactionHash,
			tokenSymbol,
			tokenDecimals,
			value,
			contract,
		} = erc20Tx;

		// assume ERC20 transfer
		let lockerDirection = ETokenTxLockerDirection.IN;
		let automationsState = ETokenTxAutomationsState.NOT_STARTED;

		locker = await lockersRepo.retrieve({
			address: to,
		});

		if (!locker) {
			locker = await lockersRepo.retrieve({
				address: from,
			});
			if (!locker) throw new Error(`Locker not found ${from}, ${to}`);

			lockerDirection = ETokenTxLockerDirection.OUT;
			// Outgoing transactions can not trigger additional automations
			automationsState = ETokenTxAutomationsState.STARTED;
		}

		tokenTx = {
			lockerId: locker!.id,
			lockerDirection,
			automationsState,
			contractAddress: contract as `0x${string}`,
			txHash: transactionHash,
			tokenSymbol,
			tokenDecimals: parseInt(tokenDecimals),
			fromAddress: from,
			toAddress: to,
			isConfirmed: moralisBody.confirmed,
			amount: value.toString(),
			chainId: parseInt(moralisBody.chainId, 16),
		};
	} else if (txsInternal && txsInternal.length > 1) {
		console.log("treating as automated ETH transfer");
		const ethTx = txsInternal[0];
		const {
			to: toAddress,
			from: fromAddress,
			value,
			transactionHash: hash,
		} = ethTx;

		// assume ETH transfer
		let lockerDirection = ETokenTxLockerDirection.IN;
		console.log("looking with toAddress", toAddress);
		locker = await lockersRepo.retrieve({
			address: toAddress,
		});

		if (!locker) {
			console.log("looking with fromAddress", fromAddress);
			locker = await lockersRepo.retrieve({
				address: fromAddress,
			});
			if (!locker)
				throw new Error(
					`Locker not found ${toAddress}, ${fromAddress}`
				);

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
			amount: value.toString(),
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
			if (!locker)
				throw new Error(
					`Locker not found ${toAddress}, ${fromAddress}`
				);

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
			amount: value.toString(),
			chainId: parseInt(moralisBody.chainId, 16),
		};
	}

	return { tokenTx, locker };
};

moralisRouter.post(
	"/webhooks/transactions",
	async (req: Request, res: Response): Promise<void> => {
		const { body: moralisBody } = req;
		console.log("/webhooks/transactions");
		console.log(JSON.parse(JSON.stringify(moralisBody)));
		const {
			txs,
			chainId: chainIdHex,
			confirmed,
			erc20Transfers,
		} = moralisBody;

		try {
			const chainId = parseInt(chainIdHex, 16);
			console.log("Received Moralis webhook");
			console.log(`Chain: ${chainId}, Confirmed: ${confirmed}`);
			if (txs.length > 0) {
				console.log(
					`TxHash: ${txs[0].hash}, ChainId: ${chainId}, From: ${txs[0].fromAddress}, To: ${txs[0].toAddress}, ERC20: ${erc20Transfers.length}`
				);
			}

			// 1. verify webhook
			if (!isTestEnv()) {
				const indexer = await getIndexerClient();
				try {
					await indexer.verifyWebhook(moralisBody, req.headers);
				} catch (error) {
					if (error instanceof InvalidSignature) {
						res.status(400).send({ error: error.message });
						return;
					}

					res.status(500).send({
						error: "An unexpected error occurred.",
					});

					return;
				}
			}

			// 2. store tx data in database
			if (txs.length > 0) {
				const tokenTxsRepo = await getTokenTxsRepo();
				const lockersRepo = await getLockersRepo();
				const { tokenTx, locker } = await adaptMoralisBody2TokenTx(
					moralisBody,
					lockersRepo
				);

				console.log("Going to insert tokenTx", tokenTx);

				try {
					const createdTx = await tokenTxsRepo.create(tokenTx);
					// This can happen if the tx is already confirmed and we try to upsert it as unconfirmed
					if (!createdTx) {
						throw new Error(
							"Unable to create token tx, maybe it was already confirmed before this update?"
						);
					}
					console.log("Created token tx", createdTx);
				} catch (error) {
					console.log("unable to insert");
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
				if (
					!isTestEnv() &&
					tokenTx.lockerDirection === ETokenTxLockerDirection.IN
				) {
					console.log("Sending email");
					const authClient = await getAuthClient();
					const user = await authClient.getUser(locker!.userId);

					const emailClient = await getEmailClient();
					await emailClient.send(
						user.emailAddresses[0].emailAddress,
						tokenTx,
						moralisBody.confirmed
					);
				}
			}
		} catch (error) {
			// Swallow exceptions to prevent unexpected retry behavior from Moralis
			try {
				delete moralisBody.data;
				delete moralisBody.input;
				delete moralisBody.abi;
			} catch (_) {
				// ignore
			}
			console.log(error);
			logger.error("Unable to process message from moralis", moralisBody);
			logger.error(error);
		}

		// Saving the txs to the DB triggers webhooks from Supabase
		// to our API at /endpoints/db-hooks/
		// Those webhooks will trigger the automations.

		res.status(200).send();
	}
);

export default moralisRouter;
