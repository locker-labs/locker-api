import {
	integer,
	pgTable,
	serial,
	timestamp,
	varchar,
} from "drizzle-orm/pg-core";

import evmTransactions from "./evmTransactions";

export const tokenTransactions = pgTable("token_transactions", {
	id: serial("id").primaryKey(),
	evmTxId: integer("evm_tx_id").references(() => evmTransactions.id),
	fromAddress: varchar("from_address", { length: 256 }).notNull(),
	toAddress: varchar("to_address", { length: 256 }).notNull(),
	contractAddress: varchar("contract_address", { length: 256 }).notNull(),
	amount: integer("amount").notNull(),
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
});

export default tokenTransactions;
