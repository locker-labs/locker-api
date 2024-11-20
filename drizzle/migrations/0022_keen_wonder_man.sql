CREATE OR REPLACE VIEW
  public.efrogr_user_stats AS
SELECT
  u.id,
  COALESCE(MAX(p.score), 0) AS "highScore",
  COALESCE(SUM(CAST(p."croakUsed" AS NUMERIC)), 0) AS "croakUsed",
  MAX(u."croakLeft") AS "croakLeft",
  MAX(u."tgJson" ->> 'username') AS "tgUsername"
FROM
  efrogr_users u
  LEFT JOIN efrogr_plays p ON p."efrogrUserId" = u.id
GROUP BY
  u.id
ORDER BY
  COALESCE(MAX(p.score), 0) DESC;
