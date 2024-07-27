-- Copied from: https://supabase.com/partners/integrations/clerk --
create or replace function requesting_user_id()
returns text
language sql stable
as $$
  select nullif(current_setting('request.jwt.claims', true)::json->>'sub', '')::text;
$$;

create policy "get_own_locker"
on "public"."lockers"
as PERMISSIVE
for SELECT
to public
using (
  (select requesting_user_id()) = user_id
);
