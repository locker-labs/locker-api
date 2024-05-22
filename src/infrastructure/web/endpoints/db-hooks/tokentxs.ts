import "dotenv/config";

import express, { Request, Response } from "express";
import morgan from "morgan";

import {
	getLockersRepo,
	getPoliciesRepo,
	getTokenTxsRepo,
	stream,
} from "../../../../dependencies";
import { TokenTxInDb } from "../../../../usecases/schemas/tokenTxs";
import PercentSplitAutomationsGenerator from "../../../clients/PercentSplitAutomationsGenerator";
import ZerodevPolicyCallDataExecutor from "../../../clients/ZerodevPolicyCallDataExecutor";
import checkApiKey from "./check-api-key";

const tokentxsDbHookRouter = express.Router();
tokentxsDbHookRouter.use(express.json());
tokentxsDbHookRouter.use(morgan("combined", { stream }));

tokentxsDbHookRouter.post(
	"/update",
	checkApiKey,
	async (req: Request, res: Response): Promise<void> => {
		try {
			console.log("/db-hooks/tokentxs/update");
			console.log(req.body);
			const rawTx = req.body.record;

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

			const {
				id,
				locker_id: lockerId,
				chain_id: chainId,
				contract_address: contractAddress,
				tx_hash: txHash,
				token_symbol: tokenSymbol,
				from_address: fromAddress,
				to_address: toAddress,
				token_decimals: tokenDecimals,
				is_confirmed: isConfirmed,
				amount,
				locker_direction: lockerDirection,
				automations_state: automationsState,
				triggered_by_token_tx_id: triggeredByTokenTxId,
				created_at: createdAt,
				updated_at: updatedAt,
			} = rawTx;

			const tx: TokenTxInDb = {
				id,
				lockerId,
				chainId,
				contractAddress,
				txHash,
				tokenSymbol,
				fromAddress,
				toAddress,
				tokenDecimals,
				isConfirmed,
				amount,
				lockerDirection,
				automationsState,
				triggeredByTokenTxId,
				createdAt,
				updatedAt,
			};

			await automationsGenerator.generateAutomations(tx);
		} catch (e) {
			console.error(
				"Something went wrong while processing the request",
				e
			);
		}

		res.status(200).send({ message: "ok" });
	}
);

export default tokentxsDbHookRouter;
