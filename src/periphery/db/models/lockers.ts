import {
	integer,
	pgTable,
	serial,
	timestamp,
	uniqueIndex,
	varchar,
} from "drizzle-orm/pg-core";

import evmTransactions from "./evmTransactions";
import users from "./users";

const lockers = pgTable(
	"lockers",
	{
		id: serial("id").primaryKey(),
		userId: serial("user_id").references(() => users.id),
		seed: varchar("seed", { length: 256 }).notNull(),
		provider: varchar("provider", { length: 256 }).notNull(),
		address: varchar("address", { length: 256 }).notNull(),
		ownerAddress: varchar("owner_address", { length: 256 }).notNull(),
		chainId: integer("chain_id").notNull(),
		deploymentTxId: serial("deployment_tx_id").references(
			() => evmTransactions.id
		),
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
