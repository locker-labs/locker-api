import winston from "winston";

import config from "../config";

const logger = winston.createLogger({
	level: "info",
	format: winston.format.json(),
	transports: [new winston.transports.File({ filename: "combined.log" })],
});

if (config.environment !== "production") {
	logger.add(
		new winston.transports.Console({
			format: winston.format.simple(),
		})
	);
}

// used for morgan HTTP request logging
const stream = {
	write: (message: string) => logger.info(message.trim()),
};

export { logger, stream };
