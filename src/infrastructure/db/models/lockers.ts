import {
	integer,
	pgTable,
	serial,
	timestamp,
	uniqueIndex,
	varchar,
} from "drizzle-orm/pg-core";

const lockers = pgTable(
	"lockers",
	{
		id: serial("id").primaryKey(),
		userId: varchar("user_id", { length: 256 }).notNull(),
		seed: integer("seed").notNull(),
		provider: varchar("provider", { length: 256 }).notNull(),
		address: varchar("address", { length: 256 }).notNull(),
		ownerAddress: varchar("owner_address", { length: 256 }).notNull(),
		chainId: integer("chain_id").notNull(),
		deploymentTxHash: varchar("deployment_tx_hash"),
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
		addressChainIdIdx: uniqueIndex("address_chain_id_idx").on(
			table.address,
			table.chainId
		),
	})
);

export default lockers;
