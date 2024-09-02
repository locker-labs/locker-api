DROP INDEX IF EXISTS "addresss_chain_id_idx";--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "addresss_chain_id_idx" ON "offramp_addresses" ("address","chain_id","contract_address");