CREATE TABLE IF NOT EXISTS "offramp_addresses" (
	"id" serial PRIMARY KEY NOT NULL,
	"offramp_account_id" integer,
	"chain_id" integer NOT NULL,
	"address" varchar(256) NOT NULL,
	"created_at" timestamp (6) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (6) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "offramp_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"offramp_account_id" integer,
	"type" varchar(256) NOT NULL,
	"offramp_address_id" integer,
	"status" varchar(256) NOT NULL,
	"errors" varchar(256),
	"created_at" timestamp (6) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (6) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "offramp_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"locker_id" integer,
	"beam_account_id" varchar(256) NOT NULL,
	"status" varchar(256) NOT NULL,
	"errors" varchar(256),
	"created_at" timestamp (6) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (6) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "addresss_chain_id_idx" ON "offramp_addresses" ("address","chain_id");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "offramp_addresses" ADD CONSTRAINT "offramp_addresses_offramp_account_id_offramp_accounts_id_fk" FOREIGN KEY ("offramp_account_id") REFERENCES "offramp_accounts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "offramp_events" ADD CONSTRAINT "offramp_events_offramp_account_id_offramp_accounts_id_fk" FOREIGN KEY ("offramp_account_id") REFERENCES "offramp_accounts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "offramp_events" ADD CONSTRAINT "offramp_events_offramp_address_id_offramp_addresses_id_fk" FOREIGN KEY ("offramp_address_id") REFERENCES "offramp_addresses"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "offramp_accounts" ADD CONSTRAINT "offramp_accounts_locker_id_lockers_id_fk" FOREIGN KEY ("locker_id") REFERENCES "lockers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
