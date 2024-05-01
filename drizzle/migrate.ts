import dotenv from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

dotenv.config();

async function main() {
	const pool = new Pool({
		connectionString: process.env.DB_URL,
	});

	const db = drizzle(pool);

	await migrate(db, { migrationsFolder: "./drizzle/migrations" });
	await pool.end();
}

main();
