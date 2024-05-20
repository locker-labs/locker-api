ALTER TABLE "policies" ALTER COLUMN "encrypted_session_key" SET DATA TYPE varchar(8192);--> statement-breakpoint
ALTER TABLE "token_transactions" ALTER COLUMN "locker_direction" DROP NOT NULL;