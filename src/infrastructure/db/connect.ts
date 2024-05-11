import { drizzle, PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import winston from "winston";

import config from "../../config";

let db: PostgresJsDatabase<Record<string, never>> | undefined;

function getOrCreateDatabase(
	logger: winston.Logger
): PostgresJsDatabase<Record<string, never>> {
	if (!db) {
		// const pool = new Pool({ connectionString: config.dbUrl });
		// db = drizzle(pool);

		const client = postgres(config.dbUrl, { prepare: false });
		db = drizzle(client);
		logger.info("Database pool created.");
	}
	return db;
}

export default getOrCreateDatabase;
