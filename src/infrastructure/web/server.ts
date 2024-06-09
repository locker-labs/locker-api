import cors from "cors";
import express, { Express } from "express";

import config from "../../config";
import { logger } from "../../dependencies";
import policiesDbHookRouter from "./endpoints/db-hooks/policies";
import tokentxsDbHookRouter from "./endpoints/db-hooks/tokentxs";
// import { getIndexerClient, logger } from "../../dependencies";
// import getOrCreateDatabase from "../db/connect";

import healthRouter from "./endpoints/metrics/health";
import lockerRouter from "./endpoints/public/lockers";
import policyRouter from "./endpoints/public/policies";
import tokenTxsRouter from "./endpoints/public/tokenTxs";
// Integrations
import beamRouter from "./endpoints/integrations/beam";
import moralisRouter from "./endpoints/integrations/moralis";

function setupRoutes(app: Express): void {
	app.use(cors({ origin: true, credentials: true }));

	app.use("/public/lockers", lockerRouter);
	app.use("/public/tokenTxs", tokenTxsRouter);
	app.use("/public/policies", policyRouter);
	app.use("/metrics/health", healthRouter);
	app.use("/db-hooks/tokentxs", tokentxsDbHookRouter);
	app.use("/db-hooks/policies", policiesDbHookRouter);
	// Integrations
	app.use("/integrations/beam", beamRouter);
	app.use("/integrations/moralis", moralisRouter);
}

// async function startup(): Promise<void> {
// 	await getOrCreateDatabase(logger);
// 	await getIndexerClient();
// }

// async function setupApp(app: Express): Promise<void> {
// 	startup();
// 	setupRoutes(app);
// }

function startServer(): Express {
	const app = express();
	setupRoutes(app);
	app.listen(config.serverPort, () => {
		logger.info(`Server is listening on port ${config.serverPort}.`);
	});

	return app;
}

export default startServer;
