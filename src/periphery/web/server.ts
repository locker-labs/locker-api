import express, { Express } from "express";

import config from "../../config";
import { logger } from "../../dependencies";
import getOrCreatePool from "../db/connect";
import lockerRouter from "./endpoints/public/lockers";

function setupRoutes(app: Express): void {
	app.use("/lockers", lockerRouter);
}

async function startup(): Promise<void> {
	await getOrCreatePool();
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
