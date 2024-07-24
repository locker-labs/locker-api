-- Step 1: Add a new column with the type text to store the amount as a string
ALTER TABLE "token_transactions" ADD COLUMN "amount_string" text;

-- Step 2: Copy the data from the bigint column to the new text column
UPDATE "token_transactions" SET "amount_string" = "amount"::text;

-- Step 3: Drop the old bigint column
ALTER TABLE "token_transactions" DROP COLUMN "amount";

-- Step 4: Rename the new column to the original column name
ALTER TABLE "token_transactions" RENAME COLUMN "amount_string" TO "amount";
