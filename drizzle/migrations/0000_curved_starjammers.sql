CREATE TABLE IF NOT EXISTS "deployments" (
	"id" serial PRIMARY KEY NOT NULL,
	"locker_id" integer,
	"deployment_tx_hash" varchar,
	"chain_id" integer NOT NULL,
	"created_at" timestamp (6) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (6) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lockers" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(256) NOT NULL,
	"seed" integer NOT NULL,
	"provider" varchar(256) NOT NULL,
	"address" varchar(256) NOT NULL,
	"owner_address" varchar(256) NOT NULL,
	"created_at" timestamp (6) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (6) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lockers_address_unique" UNIQUE("address")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "token_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"locker_id" integer,
	"chain_id" integer NOT NULL,
	"tx_hash" varchar(256) NOT NULL,
	"from_address" varchar(256) NOT NULL,
	"to_address" varchar(256) NOT NULL,
	"contract_address" varchar(256) NOT NULL,
	"amount" bigint NOT NULL,
	"created_at" timestamp (6) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (6) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "deployment_tx_hash_chain_id_idx" ON "deployments" ("deployment_tx_hash","chain_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "tx_hash_chain_id_idx" ON "token_transactions" ("tx_hash","chain_id");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "deployments" ADD CONSTRAINT "deployments_locker_id_lockers_id_fk" FOREIGN KEY ("locker_id") REFERENCES "lockers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "token_transactions" ADD CONSTRAINT "token_transactions_locker_id_lockers_id_fk" FOREIGN KEY ("locker_id") REFERENCES "lockers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
