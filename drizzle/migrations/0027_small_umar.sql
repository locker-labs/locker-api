CREATE OR REPLACE VIEW
  public.efrogr_plays_stats AS
SELECT
  u."id" as user_id,
  u."tgJson" ->> 'id' AS tg_id,
  u.address,
  DATE_TRUNC(
    'day',
    p."createdAt" AT TIME ZONE 'UTC' 
  )  AS play_date,
  MAX(p."createdAt") AS last_play_date,
  u."tgJson" ->> 'username' AS tg_username,
  COUNT(*) AS num_plays,
  MAX(score) AS high_score,
  SUM(CAST(p."croakUsed" AS NUMERIC)) / 1e18 AS croak_used
FROM
  efrogr_plays p
  JOIN efrogr_users u ON p."efrogrUserId" = u.id
GROUP BY
  u.id,
  play_date,
  u."tgJson" ->> 'username',
  u."tgJson" ->> 'id',
  u.address
ORDER BY
  play_date DESC,
  high_score DESC;