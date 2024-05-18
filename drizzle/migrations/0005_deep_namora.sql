ALTER TABLE "token_transactions" ADD COLUMN "triggered_by_token_tx_id" integer;--> statement-breakpoint
ALTER TABLE "token_transactions" ADD COLUMN "locker_direction" varchar(32) NOT NULL;--> statement-breakpoint
ALTER TABLE "token_transactions" ADD COLUMN "automations_state" varchar(32) DEFAULT 'not_started' NOT NULL;