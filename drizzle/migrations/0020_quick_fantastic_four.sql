create policy "get_own_offramp_accounts"
on "public"."offramp_accounts"
as PERMISSIVE
for SELECT
to public
using (
  (locker_id = ( SELECT lockers.id
   FROM lockers
  WHERE ((lockers.user_id)::text = requesting_user_id())))
);

create policy "get_own_offramp_addresses"
on "public"."offramp_addresses"
as PERMISSIVE
for SELECT
to public
using (
  (EXISTS ( SELECT 1
   FROM (offramp_accounts
     JOIN lockers ON ((offramp_accounts.locker_id = lockers.id)))
  WHERE ((offramp_addresses.offramp_account_id = offramp_accounts.id) AND ((lockers.user_id)::text = requesting_user_id()))))
);
