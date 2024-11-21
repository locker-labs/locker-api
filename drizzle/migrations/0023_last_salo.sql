-- Add createdAt and updatedAt columns to efrogr_users
ALTER TABLE "efrogr_users" 
ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP DEFAULT now() NOT NULL,
ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP DEFAULT now() NOT NULL;

-- Add createdAt and updatedAt columns to efrogr_plays
ALTER TABLE "efrogr_plays" 
ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP DEFAULT now() NOT NULL,
ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP DEFAULT now() NOT NULL;

-- Create a function to auto-update the updatedAt field
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for efrogr_users to auto-update updatedAt
CREATE TRIGGER trigger_updatedAt_efrogr_users
BEFORE UPDATE ON "efrogr_users"
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- Create trigger for efrogr_plays to auto-update updatedAt
CREATE TRIGGER trigger_updatedAt_efrogr_plays
BEFORE UPDATE ON "efrogr_plays"
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();