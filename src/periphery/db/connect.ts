import { Pool } from "pg";

import config from "../../config";
import { logger } from "../../dependencies";

let pool: Pool | undefined;

function getOrCreatePool(): Pool {
	if (!pool) {
		pool = new Pool({ connectionString: config.dbUrl });
		logger.info("Database pool created.");
	}
	return pool;
}

export default getOrCreatePool;
