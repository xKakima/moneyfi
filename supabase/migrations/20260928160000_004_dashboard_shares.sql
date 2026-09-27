CREATE TABLE public.dashboard_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  allow_accounts BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);

ALTER TABLE public.dashboard_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view their dashboard shares"
  ON public.dashboard_shares FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Owners can create their dashboard shares"
  ON public.dashboard_shares FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners can update their dashboard shares"
  ON public.dashboard_shares FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners can revoke their dashboard shares"
  ON public.dashboard_shares FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

REVOKE ALL ON TABLE public.dashboard_shares FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.dashboard_shares TO authenticated;

CREATE OR REPLACE FUNCTION public.get_shared_overview(p_token_hash TEXT)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  share_row public.dashboard_shares%ROWTYPE;
BEGIN
  IF p_token_hash IS NULL OR p_token_hash !~ '^[0-9a-f]{64}$' THEN
    RETURN NULL;
  END IF;

  SELECT share.*
  INTO share_row
  FROM public.dashboard_shares AS share
  WHERE share.token_hash = p_token_hash
    AND share.revoked_at IS NULL;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'cash', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('currency', totals.currency, 'value', totals.amount)
        ORDER BY CASE WHEN totals.currency = 'PHP' THEN 0 ELSE 1 END, totals.currency), '[]'::JSONB)
      FROM (
        SELECT COALESCE(account.currency, 'USD') AS currency,
          SUM(COALESCE(account.balance, 0)) AS amount
        FROM public.accounts AS account
        WHERE account.user_id = share_row.user_id
          AND account.type IN ('bank', 'ewallet')
        GROUP BY COALESCE(account.currency, 'USD')
      ) AS totals
    ),
    'investments', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('currency', totals.currency, 'value', totals.amount)
        ORDER BY CASE WHEN totals.currency = 'PHP' THEN 0 ELSE 1 END, totals.currency), '[]'::JSONB)
      FROM (
        SELECT COALESCE(account.currency, 'USD') AS currency,
          SUM(COALESCE(account.balance, 0)) AS amount
        FROM public.accounts AS account
        WHERE account.user_id = share_row.user_id
          AND account.type = 'investment'
        GROUP BY COALESCE(account.currency, 'USD')
      ) AS totals
    ),
    'credit_debt', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('currency', totals.currency, 'value', totals.amount)
        ORDER BY CASE WHEN totals.currency = 'PHP' THEN 0 ELSE 1 END, totals.currency), '[]'::JSONB)
      FROM (
        SELECT COALESCE(account.currency, 'USD') AS currency,
          SUM(ABS(COALESCE(account.balance, 0))) AS amount
        FROM public.accounts AS account
        WHERE account.user_id = share_row.user_id
          AND account.type = 'credit_card'
        GROUP BY COALESCE(account.currency, 'USD')
      ) AS totals
    ),
    'accounts', CASE
      WHEN share_row.allow_accounts AND auth.uid() IS NOT NULL THEN (
        SELECT COALESCE(jsonb_agg(jsonb_build_object(
          'name', account.name,
          'type', account.type,
          'balance', account.balance,
          'currency', COALESCE(account.currency, 'USD')
        ) ORDER BY account.name), '[]'::JSONB)
        FROM public.accounts AS account
        WHERE account.user_id = share_row.user_id
      )
      ELSE NULL
    END,
    'accounts_require_sign_in', share_row.allow_accounts AND auth.uid() IS NULL
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.get_shared_overview(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_shared_overview(TEXT) TO anon, authenticated;