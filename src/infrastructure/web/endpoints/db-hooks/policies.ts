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
			const policyToLog = JSON.parse(JSON.stringify(policy));
			delete policyToLog.encrypted_session_key;
			delete policyToLog.encoded_iv;
			console.log(policyToLog);

			const {
				encrypted_session_key: encryptedSessionKey,
				encoded_iv: encodedIv,
				chain_id: chainId,
				locker_id: lockerId,
			} = policy;

			if (!encryptedSessionKey || !encodedIv) {
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
			// Because of nonces, userOps will fail if multiple are sent at once
			// Therefore we currently only use the most recent tx to generate automations
			const txs = await tokenTxsApi.retrieveMany({ chainId, lockerId });
			console.log("Got relevant txs", txs);
			console.log(txs);

			if (txs.length > 0) {
				// const txAutomationPromises = txs.map((tx) =>
				await automationsGenerator.generateAutomations(txs[0]);
				// );
			}

			// await Promise.all(txAutomationPromises);
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
