import "dotenv/config";

import express, { Request, Response } from "express";
import morgan from "morgan";

import {
	getLockersRepo,
	getPoliciesRepo,
	getTokenTxsRepo,
	stream,
} from "../../../../dependencies";
import PercentSplitAutomationsGenerator from "../../../clients/PercentSplitAutomationsGenerator";
import ZerodevPolicyCallDataExecutor from "../../../clients/ZerodevPolicyCallDataExecutor";
import checkApiKey from "./check-api-key";

const policiesDbHookRouter = express.Router();
policiesDbHookRouter.use(express.json());
policiesDbHookRouter.use(morgan("combined", { stream }));

policiesDbHookRouter.post(
	"/update",
	checkApiKey,
	async (req: Request, res: Response): Promise<void> => {
		try {
			console.log("/db-hooks/policies/update");
			const policy = req.body.record;

			const {
				encrypted_session_key: encryptedSessionKey,
				encoded_iv: encodedIv,
				chain_id: chainId,
				locker_id: lockerId,
			} = policy;

			console.log("policy");
			console.log(encodedIv);

			if (!encryptedSessionKey || !encodedIv) {
				console.log("no encryptedSessionKey or encodedIv");
				res.status(200).send({ message: "ok" });
				return;
			}

			const policiesApi = await getPoliciesRepo();
			const tokenTxsApi = await getTokenTxsRepo();
			const lockersApi = await getLockersRepo();
			const callDataExecutor = new ZerodevPolicyCallDataExecutor();

			const automationsGenerator = new PercentSplitAutomationsGenerator(
				policiesApi,
				tokenTxsApi,
				lockersApi,
				callDataExecutor
			);

			// Find all transactions from same chain as first
			const txs = await tokenTxsApi.retrieveMany({ chainId, lockerId });
			const txAutomationPromises = txs.map((tx) => {
				console.log("Generating automations for tx", tx.txHash);
				return automationsGenerator.generateAutomations(tx);
			});

			await Promise.all(txAutomationPromises);
		} catch (e) {
			console.error(
				"Something went wrong while processing the request",
				e
			);
		}

		res.status(200).send({ message: "ok" });
	}
);

export default policiesDbHookRouter;
