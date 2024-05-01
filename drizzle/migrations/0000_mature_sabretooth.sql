CREATE TABLE IF NOT EXISTS "evm_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" serial NOT NULL,
	"from_address" varchar(256) NOT NULL,
	"to_address" varchar(256) NOT NULL,
	"value" integer,
	"tx_hash" varchar(256) NOT NULL,
	"block_hash" varchar(256),
	"gas_price" integer,
	"chain_id" integer NOT NULL,
	"created_at" timestamp (6) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (6) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lockers" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" serial NOT NULL,
	"seed" varchar(256) NOT NULL,
	"provider" varchar(256) NOT NULL,
	"address" varchar(256) NOT NULL,
	"owner_address" varchar(256) NOT NULL,
	"chain_id" integer NOT NULL,
	"deployment_tx_id" serial NOT NULL,
	"created_at" timestamp (6) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (6) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "token_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"evm_tx_id" serial NOT NULL,
	"from_address" varchar(256) NOT NULL,
	"to_address" varchar(256) NOT NULL,
	"contract_address" varchar(256) NOT NULL,
	"amount" integer NOT NULL,
	"created_at" timestamp (6) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (6) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(256) NOT NULL,
	"created_at" timestamp (6) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (6) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "tx_hash_chain_id_idx" ON "evm_transactions" ("tx_hash","chain_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "address_chain_id_idx" ON "lockers" ("address","chain_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "email_idx" ON "users" ("email");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "evm_transactions" ADD CONSTRAINT "evm_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lockers" ADD CONSTRAINT "lockers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lockers" ADD CONSTRAINT "lockers_deployment_tx_id_evm_transactions_id_fk" FOREIGN KEY ("deployment_tx_id") REFERENCES "evm_transactions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "token_transactions" ADD CONSTRAINT "token_transactions_evm_tx_id_evm_transactions_id_fk" FOREIGN KEY ("evm_tx_id") REFERENCES "evm_transactions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
