-- efrogr_users table
CREATE TABLE IF NOT EXISTS "efrogr_users" (
    "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY NOT NULL,
    "dynamicUserId" text NOT NULL UNIQUE,
    "tgJson" jsonb NOT NULL,
    "address" text NOT NULL UNIQUE,
    "croakLeft" text NOT NULL DEFAULT '0',
    "highScore" bigint NOT NULL DEFAULT 0
);

-- efrogr_plays table
CREATE TABLE IF NOT EXISTS "efrogr_plays" (
    "id" serial PRIMARY KEY NOT NULL,
    "efrogrUserId" uuid NOT NULL,
    "score" integer DEFAULT -1 NOT NULL,
    "croakUsed" text NOT NULL,
    CONSTRAINT "efrogr_plays_efrogrUserId_fk" FOREIGN KEY ("efrogrUserId") REFERENCES "efrogr_users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

DO $$ BEGIN
    ALTER TABLE "efrogr_plays" ADD CONSTRAINT "efrogr_plays_efrogrUserId_fk" FOREIGN KEY ("efrogrUserId") REFERENCES "efrogr_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;