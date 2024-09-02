ALTER TABLE "offramp_events" DROP CONSTRAINT IF EXISTS "offramp_events_offramp_account_id_offramp_accounts_id_fk";
--> statement-breakpoint
ALTER TABLE "offramp_events" DROP CONSTRAINT IF EXISTS "offramp_events_offramp_address_id_offramp_addresses_id_fk";
--> statement-breakpoint
ALTER TABLE "offramp_events" ADD COLUMN "beam_account_id" text;--> statement-breakpoint
ALTER TABLE "offramp_events" ADD COLUMN "payload" jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "offramp_events" DROP COLUMN IF EXISTS "offramp_account_id";--> statement-breakpoint
ALTER TABLE "offramp_events" DROP COLUMN IF EXISTS "offramp_address_id";--> statement-breakpoint
ALTER TABLE "offramp_events" DROP COLUMN IF EXISTS "status";--> statement-breakpoint
ALTER TABLE "offramp_events" DROP COLUMN IF EXISTS "errors";