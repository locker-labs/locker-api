import {
	integer,
	pgTable,
	serial,
	timestamp,
	varchar,
} from "drizzle-orm/pg-core";

const lockers = pgTable("lockers", {
	id: serial("id").primaryKey(),
	userId: varchar("user_id", { length: 256 }).notNull(),
	seed: integer("seed").notNull(),
	provider: varchar("provider", { length: 256 }).notNull(),
	address: varchar("address", { length: 256 }).notNull().unique(),
	ownerAddress: varchar("owner_address", { length: 256 }).notNull(),
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

export default lockers;
