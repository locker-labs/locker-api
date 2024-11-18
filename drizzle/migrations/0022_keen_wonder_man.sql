-- leaderboard view --
CREATE VIEW
  public.efrogr_user_stats AS
SELECT
  u.id,
  MAX(p.score) AS "highScore",
  SUM(CAST(p."croakUsed" AS NUMERIC)) AS "croakUsed",
  MAX(u."croakLeft") AS "croakLeft",
  MAX(u."tgJson" ->> 'username') AS "tgUsername"
FROM
  efrogr_users u
  JOIN efrogr_plays p ON p."efrogrUserId" = u.id
GROUP BY
  u.id
order by MAX(p.score) desc;
