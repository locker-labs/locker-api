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
import moralisRouter from "../integrations/moralis";
// import checkApiKey from "./check-api-key";

const tokentxsDbHookRouter = express.Router();
tokentxsDbHookRouter.use(express.json());
tokentxsDbHookRouter.use(morgan("combined", { stream }));

tokentxsDbHookRouter.post(
	"/update",
	// checkApiKey,
	async (req: Request, res: Response): Promise<void> => {
		try {
			console.log("/db-hooks/tokentxs/update");

			console.log(req.body);
			const tx = req.body.json().record as TokenTxInDb;

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

export default moralisRouter;
