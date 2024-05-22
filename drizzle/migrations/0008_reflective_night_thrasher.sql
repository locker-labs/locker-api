drop trigger if exists "after_policy_update" on "public"."policies";

CREATE TRIGGER after_policy_update AFTER INSERT OR UPDATE ON public.policies FOR EACH ROW EXECUTE FUNCTION supabase_functions.http_request('https://EXAMPLE.COM/db-hooks/policies/update', 'POST', '{"Content-type":"application/json","api-key":"3962f45c-a1e3-4729-82a8-3c7fe2d7db76"}', '{}', '5000');
