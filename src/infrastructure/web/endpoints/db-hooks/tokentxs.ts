import "dotenv/config";

import express, { Request, Response } from "express";
import morgan from "morgan";

import {
	getLockersRepo,
	getOffRampRepo,
	getPoliciesRepo,
	getTokenTxsRepo,
	logger,
	stream,
} from "../../../../dependencies";
import { TokenTxInDb } from "../../../../usecases/schemas/tokenTxs";
import AutomationService from "../../../../usecases/services/automation";
import ZerodevClient from "../../../clients/zerodev";
import checkApiKey from "./check-api-key";
// import checkApiKey from "./check-api-key";

const tokentxsDbHookRouter = express.Router();
tokentxsDbHookRouter.use(express.json());
tokentxsDbHookRouter.use(morgan("combined", { stream }));

tokentxsDbHookRouter.post(
	"/update",
	checkApiKey,
	async (req: Request, res: Response): Promise<void> => {
		try {
			console.log("Processing tokentx...");
			console.log(JSON.stringify(req.body, null, 2));
			const rawTx = req.body.record;
			// console.log(JSON.stringify(req.body.record, null, 2));

			const policiesApi = await getPoliciesRepo();
			const tokenTxsApi = await getTokenTxsRepo();
			const lockersApi = await getLockersRepo();
			const offRampRepo = await getOffRampRepo();
			const callDataExecutor = new ZerodevClient();

			const automationsGenerator = new AutomationService(
				policiesApi,
				tokenTxsApi,
				lockersApi,
				offRampRepo,
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
			console.log("Successfully processed");

			const generatedAutomations =
				await automationsGenerator.generateAutomations(tx);
			res.status(200).send({
				message: "ok",
				generatedAutomations,
			});
			return;
		} catch (e) {
			logger.error(
				"Something went wrong while processing the request",
				e
			);
		}

		res.status(200).send({ message: "ok", generatedAutomations: false });
	}
);

export default tokentxsDbHookRouter;
