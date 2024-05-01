import { drizzle, NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import config from "../../config";
import { logger } from "../../dependencies";

let db: NodePgDatabase<Record<string, never>> | undefined;

function getOrCreateDatabase(): NodePgDatabase<Record<string, never>> {
	if (!db) {
		const pool = new Pool({ connectionString: config.dbUrl });
		db = drizzle(pool);
		logger.info("Database pool created.");
	}
	return db;
}

export default getOrCreateDatabase;
