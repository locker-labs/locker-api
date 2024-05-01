const startServer = require("./periphery/web/server");
import { logger } from "./dependencies";

if (require.main === module) {
	logger.info("Starting server.");
	startServer();
}
