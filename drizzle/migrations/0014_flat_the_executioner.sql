create policy "get_own_policy"
on "public"."policies"
as PERMISSIVE
for SELECT
to public
using (
  (locker_id = ( SELECT lockers.id
   FROM lockers
  WHERE ((lockers.user_id)::text = requesting_user_id())))
);

create policy "get_own_tx"
on "public"."token_transactions"
as PERMISSIVE
for SELECT
to public
using (
  (locker_id = ( SELECT lockers.id
   FROM lockers
  WHERE ((lockers.user_id)::text = requesting_user_id())))
);
