import {
	integer,
	jsonb,
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
	onboardingUrl: text("onboarding_url").notNull(),
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
		contractAddress: text("contract_address").notNull(),
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
			table.chainId,
			table.contractAddress
		),
	})
);

// This table lets us know the status of both bank transfers and on-chain deposits into beam addresses
const offRampEvents = pgTable("offramp_events", {
	id: serial("id").primaryKey(),
	// parsed from the payload. Not making an explicit association to offrampAccount in case the account is deleted or missing
	beamAccountId: text("beam_account_id"),
	payload: jsonb("payload").notNull(),
	type: text("type").notNull(),
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
