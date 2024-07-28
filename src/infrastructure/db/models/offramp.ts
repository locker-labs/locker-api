import {
	integer,
	pgTable,
	serial,
	text,
	timestamp,
	uniqueIndex,
} from "drizzle-orm/pg-core";

import lockers from "./lockers";

// This table allows us to keep track off our users' beam accounts and link them to their lockers
const offrampAccount = pgTable("offramp_accounts", {
	id: serial("id").primaryKey(),
	lockerId: integer("locker_id").references(() => lockers.id),
	beamAccountId: text("beam_account_id").notNull().unique(),
	status: text("status").notNull(), // for onboarding
	errors: text("errors"),
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

// This table allows us to keep track of the addresses beam assigns to each beam account for receiving funds on supported chains.
const offRampAddresses = pgTable(
	"offramp_addresses",
	{
		id: serial("id").primaryKey(),
		offRampAccountId: integer("offramp_account_id").references(
			() => offrampAccount.id
		),
		chainId: integer("chain_id").notNull(),
		address: text("address").notNull(),
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
		addressChainIdIdx: uniqueIndex("addresss_chain_id_idx").on(
			table.address,
			table.chainId
		),
	})
);

// This table lets us know the status of both bank transfers and on-chain deposits into beam addresses
const offRampEvents = pgTable("offramp_events", {
	id: serial("id").primaryKey(),
	offRampAccountId: integer("offramp_account_id").references(
		() => offrampAccount.id
	),
	type: text("type").notNull(), // delineates between bank transfers and crypto transfers
	offRampAddressId: integer("offramp_address_id").references(
		// null if the record is a bank transfer
		() => offRampAddresses.id
	),
	status: text("status").notNull(),
	errors: text("errors"),
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

export { offrampAccount, offRampAddresses, offRampEvents };
