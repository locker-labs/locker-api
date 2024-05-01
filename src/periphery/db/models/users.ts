import {
	pgTable,
	serial,
	timestamp,
	uniqueIndex,
	varchar,
} from "drizzle-orm/pg-core";

const users = pgTable(
	"users",
	{
		id: serial("id").primaryKey(),
		email: varchar("email", { length: 256 }).notNull(),
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
		emailIdx: uniqueIndex("email_idx").on(table.email),
	})
);

export default users;
