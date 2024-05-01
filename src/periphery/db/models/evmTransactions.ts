import {
	integer,
	pgTable,
	serial,
	timestamp,
	uniqueIndex,
	varchar,
} from "drizzle-orm/pg-core";

import users from "./users";

const evmTransactions = pgTable(
	"evm_transactions",
	{
		id: serial("id").primaryKey(),
		userId: serial("user_id").references(() => users.id),
		fromAddress: varchar("from_address", { length: 256 }).notNull(),
		toAddress: varchar("to_address", { length: 256 }).notNull(),
		value: integer("value").notNull(),
		txHash: varchar("tx_hash", { length: 256 }).notNull(),
		blockHash: varchar("block_hash", { length: 256 }),
		blockNumber: integer("value"),
		gasPirce: integer("gas_price"),
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
		txHashChainIdIdx: uniqueIndex("tx_hash_chain_id_idx").on(
			table.txHash,
			table.chainId
		),
	})
);

export default evmTransactions;
