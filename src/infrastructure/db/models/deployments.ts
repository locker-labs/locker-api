import {
	integer,
	pgTable,
	serial,
	timestamp,
	uniqueIndex,
	varchar,
} from "drizzle-orm/pg-core";

import lockers from "./lockers";

const deployments = pgTable(
	"deployments",
	{
		id: serial("id").primaryKey(),
		lockerId: integer("locker_id").references(() => lockers.id),
		txHash: varchar("deployment_tx_hash"),
		chainId: integer("chain_id").notNull(),
		createdAt: timestamp("created_at", {
			mode: "date",
			precision: 6,
			withTimezone: true,
		})
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", {
			mode: "date",
			precision: 6,
			withTimezone: true,
		})
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => ({
		addressChainIdIdx: uniqueIndex("deployment_tx_hash_chain_id_idx").on(
			table.txHash,
			table.chainId
		),
	})
);

export default deployments;
