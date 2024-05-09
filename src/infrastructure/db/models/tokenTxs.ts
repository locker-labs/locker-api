import {
	bigint,
	integer,
	pgTable,
	serial,
	timestamp,
	uniqueIndex,
	varchar,
} from "drizzle-orm/pg-core";

import lockers from "./lockers";

export const tokenTxs = pgTable(
	"token_transactions",
	{
		id: serial("id").primaryKey(),
		lockerId: integer("locker_id").references(() => lockers.id),
		chainId: integer("chain_id").notNull(),
		txHash: varchar("tx_hash", { length: 256 }).notNull(),
		fromAddress: varchar("from_address", { length: 256 }).notNull(),
		toAddress: varchar("to_address", { length: 256 }).notNull(),
		contractAddress: varchar("contract_address", { length: 256 }).notNull(),
		amount: bigint("amount", { mode: "bigint" }).notNull(),
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
		addressChainIdIdx: uniqueIndex("tx_hash_chain_id_idx").on(
			table.txHash,
			table.chainId
		),
	})
);

export default tokenTxs;
