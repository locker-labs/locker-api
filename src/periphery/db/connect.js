const { Pool } = require("pg");
const config = require("../../config");
const { logger } = require("../../dependencies");

let pool;

function getOrCreatePool() {
	if (!pool) {
		pool = new Pool({ connectionString: config.dbUrl });
		logger.info("Database pool created.");
	}
	return pool;
}

module.exports = getOrCreatePool;
