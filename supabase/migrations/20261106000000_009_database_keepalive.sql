CREATE OR REPLACE FUNCTION public.ping_database()
RETURNS integer
LANGUAGE sql
STABLE
SET search_path = ''
AS $function$
  SELECT 1;
$function$;

REVOKE ALL ON FUNCTION public.ping_database() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ping_database() TO anon;
