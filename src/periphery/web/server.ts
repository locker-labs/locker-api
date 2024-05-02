import cors from "cors";
import express, { Express } from "express";

import config from "../../config";
import { logger } from "../../dependencies";
import getOrCreateDatabase from "../db/connect";
import healthRouter from "./endpoints/metrics/health";
import lockerRouter from "./endpoints/public/lockers";

function setupRoutes(app: Express): void {
	app.use(cors());

	app.use("/lockers", lockerRouter);
	app.use("/health", healthRouter);
}

async function startup(): Promise<void> {
	await getOrCreateDatabase();
}

async function setupApp(app: Express): Promise<void> {
	await startup();
	setupRoutes(app);
}

function startServer(): void {
	const app = express();
	setupApp(app);
	app.listen(config.serverPort, () => {
		logger.info(`Server is listening on port ${config.serverPort}.`);
	});
}

export default startServer;
