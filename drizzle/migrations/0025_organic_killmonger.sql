ALTER TABLE "token_transactions" ADD COLUMN "batched_by" jsonb DEFAULT '[]'::jsonb;