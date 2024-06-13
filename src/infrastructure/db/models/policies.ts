import {
	integer,
	jsonb,
	pgTable,
	serial,
	timestamp,
	uniqueIndex,
	varchar,
} from "drizzle-orm/pg-core";

import lockers from "./lockers";

const policies = pgTable(
	"policies",
	{
		id: serial("id").primaryKey(),
		lockerId: integer("locker_id").references(() => lockers.id),
		chainId: integer("chain_id").notNull(),
		encryptedSessionKey: varchar("encrypted_session_key").notNull(),
		encodedIv: varchar("encoded_iv").notNull(),
		automations: jsonb("automations").notNull(),
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
		addressChainIdIdx: uniqueIndex("locker_id_chain_id_idx").on(
			table.lockerId,
			table.chainId
		),
	})
);

export default policies;
