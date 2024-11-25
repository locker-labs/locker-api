-- Drop the existing view to replace it with the updated version
DROP VIEW IF EXISTS public.efrogr_user_stats;

-- Create the updated view
CREATE OR REPLACE VIEW public.efrogr_user_stats AS
SELECT
  u.id,
  u.address AS "address",
  COALESCE(MAX(p.score), 0) AS "highScore",
  COALESCE(SUM(CAST(p."croakUsed" AS NUMERIC)), 0) AS "croakUsed",
  MAX(u."croakLeft") AS "croakLeft",
  MAX(u."tgJson" ->> 'username') AS "tgUsername",
  COUNT(
    CASE
      WHEN p."createdAt" >= (
        -- Calculate 7 PM US Central time for the last 24 hours
        DATE_TRUNC('day', now() AT TIME ZONE 'America/Chicago') + INTERVAL '19 hours' - INTERVAL '1 day'
      ) THEN 1
      ELSE NULL
    END
  ) AS "numEntries"
FROM
  efrogr_users u
  LEFT JOIN efrogr_plays p ON p."efrogrUserId" = u.id
GROUP BY
  u.id, u.address
ORDER BY
  COALESCE(MAX(p.score), 0) DESC;

-- Add comments for clarity
COMMENT ON VIEW public.efrogr_user_stats IS 'Aggregated user statistics including high score, total CROAK used, remaining CROAK, username, address, and number of plays in the past 24 hours since 7 PM US Central time.';
