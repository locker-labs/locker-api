import "dotenv/config";

import express, { Request, Response } from "express";
import morgan from "morgan";

import {
	getLockersRepo,
	getPoliciesRepo,
	getTokenTxsRepo,
	logger,
	stream,
} from "../../../../dependencies";
import AutomationService from "../../../../usecases/services/automation";
import ZerodevClient from "../../../clients/zerodev";
import checkApiKey from "./check-api-key";

const policiesDbHookRouter = express.Router();
policiesDbHookRouter.use(express.json());
policiesDbHookRouter.use(morgan("combined", { stream }));

policiesDbHookRouter.post(
	"/update",
	checkApiKey,
	async (req: Request, res: Response): Promise<void> => {
		try {
			console.log("policy updated");
			const policy = req.body.record;
			console.log(req.body.record);

			const {
				encrypted_session_key: encryptedSessionKey,
				encoded_iv: encodedIv,
				chain_id: chainId,
				locker_id: lockerId,
			} = policy;

			if (!encryptedSessionKey || !encodedIv) {
				console.log("no session key or iv");
				res.status(200).send({ message: "ok" });
				return;
			}

			const policiesApi = await getPoliciesRepo();
			const tokenTxsApi = await getTokenTxsRepo();
			const lockersApi = await getLockersRepo();
			const callDataExecutor = new ZerodevClient();

			const automationsGenerator = new AutomationService(
				policiesApi,
				tokenTxsApi,
				lockersApi,
				callDataExecutor
			);

			// Find all transactions from same chain as first
			const txs = await tokenTxsApi.retrieveMany({ chainId, lockerId });
			console.log("Got relevant txs", txs);
			console.log(txs);
			const txAutomationPromises = txs.map((tx) =>
				automationsGenerator.generateAutomations(tx)
			);

			await Promise.all(txAutomationPromises);
		} catch (e) {
			logger.error(
				"Something went wrong while processing the request",
				e
			);
		}

		res.status(200).send({ message: "ok" });
	}
);

export default policiesDbHookRouter;
