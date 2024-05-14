ALTER TABLE "token_transactions" ADD COLUMN "token_decimals" integer;--> statement-breakpoint
ALTER TABLE "token_transactions" ADD COLUMN "is_confirmed" boolean DEFAULT false;