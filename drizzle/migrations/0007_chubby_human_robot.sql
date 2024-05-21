drop trigger if exists "after_tokentx_insert" on "public"."token_transactions";

CREATE TRIGGER after_execution_update_send_emails AFTER INSERT OR UPDATE ON public.token_transactions FOR EACH ROW EXECUTE FUNCTION supabase_functions.http_request('https://EXAMPLE.COM/db-hooks/tokentxs/update', 'POST', '{"Content-type":"application/json","api-key":"3962f45c-a1e3-4729-82a8-3c7fe2d7db76"}', '{}', '5000');
