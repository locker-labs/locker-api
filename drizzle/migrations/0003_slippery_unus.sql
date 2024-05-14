CREATE TABLE IF NOT EXISTS "policies" (
	"id" serial PRIMARY KEY NOT NULL,
	"locker_id" integer,
	"chain_id" integer NOT NULL,
	"encrypted_session_key" varchar(256) NOT NULL,
	"encoded_iv" varchar(256) NOT NULL,
	"automations" json NOT NULL,
	"created_at" timestamp (6) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (6) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "locker_id_chain_id_idx" ON "policies" ("locker_id","chain_id");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "policies" ADD CONSTRAINT "policies_locker_id_lockers_id_fk" FOREIGN KEY ("locker_id") REFERENCES "lockers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
