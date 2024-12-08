import { relations } from "drizzle-orm";
import {
	boolean,
	doublePrecision,
	integer,
	jsonb,
	pgTable,
	serial,
	text,
	timestamp,
	uniqueIndex,
	varchar,
} from "drizzle-orm/pg-core";

import { ETokenTxAutomationsState } from "../../../usecases/schemas/tokenTxs";
import lockers from "./lockers";

export const tokenTxs = pgTable(
	"token_transactions",
	{
		id: serial("id").primaryKey(),
		lockerId: integer("locker_id").references(() => lockers.id),
		triggeredByTokenTxId: integer("triggered_by_token_tx_id"),
		chainId: integer("chain_id").notNull(),
		// `in` or `out` of locker
		lockerDirection: varchar("locker_direction", { length: 32 }),
		// `not_started` or `started`
		automationsState: varchar("automations_state", { length: 32 })
			.notNull()
			.default(ETokenTxAutomationsState.NOT_STARTED),
		txHash: varchar("tx_hash", { length: 256 }).notNull(),
		fromAddress: varchar("from_address", { length: 256 }).notNull(),
		toAddress: varchar("to_address", { length: 256 }).notNull(),
		contractAddress: varchar("contract_address", { length: 256 }).notNull(),
		tokenSymbol: varchar("token_symbol", { length: 256 }).notNull(),
		tokenDecimals: integer("token_decimals"),
		isConfirmed: boolean("is_confirmed").default(false),
		amount: text("amount").notNull(),
		usdValue: doublePrecision("usd_value"),
		batchedBy: jsonb("batched_by").default([]), // Adding jsonb column with default empty array
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

export const triggeredTokenTxsRelations = relations(tokenTxs, ({ many }) => ({
	triggeredTokenTxs: many(tokenTxs),
}));

export const triggeredByTokenTxRelations = relations(tokenTxs, ({ one }) => ({
	triggeredByTokenTx: one(tokenTxs, {
		fields: [tokenTxs.triggeredByTokenTxId],
		references: [tokenTxs.id],
	}),
}));
