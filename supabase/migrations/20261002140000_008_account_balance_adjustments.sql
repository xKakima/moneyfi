CREATE OR REPLACE FUNCTION public.reconcile_account_balance(
  p_account_id UUID,
  p_mode TEXT,
  p_amount NUMERIC,
  p_category TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  account_row public.accounts%ROWTYPE;
  adjustment_delta NUMERIC;
  adjusted_balance NUMERIC;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'You must be signed in to adjust an account.';
  END IF;

  IF p_mode NOT IN ('increase', 'decrease', 'current_balance') THEN
    RAISE EXCEPTION 'Choose a valid adjustment method.';
  END IF;

  IF p_amount IS NULL OR p_amount < 0 OR (p_mode <> 'current_balance' AND p_amount = 0) THEN
    RAISE EXCEPTION 'Enter a valid amount.';
  END IF;

  SELECT account.*
  INTO account_row
  FROM public.accounts AS account
  WHERE account.id = p_account_id
    AND account.user_id = auth.uid()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Account not found.';
  END IF;

  adjustment_delta := CASE p_mode
    WHEN 'increase' THEN p_amount
    WHEN 'decrease' THEN -p_amount
    ELSE p_amount - COALESCE(account_row.balance, 0)
  END;

  IF adjustment_delta = 0 THEN
    RETURN 0;
  END IF;

  adjusted_balance := COALESCE(account_row.balance, 0) + adjustment_delta;

  UPDATE public.accounts
  SET balance = adjusted_balance
  WHERE id = account_row.id
    AND user_id = auth.uid();

  INSERT INTO public.transactions (
    user_id,
    account_id,
    amount,
    currency,
    category,
    transaction_type,
    notes
  ) VALUES (
    auth.uid(),
    account_row.id,
    adjustment_delta,
    COALESCE(account_row.currency, 'USD'),
    COALESCE(NULLIF(BTRIM(p_category), ''), 'Balance adjustment'),
    'adjustment',
    NULLIF(BTRIM(p_notes), '')
  );

  RETURN adjustment_delta;
END;
$function$;

REVOKE ALL ON FUNCTION public.reconcile_account_balance(UUID, TEXT, NUMERIC, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reconcile_account_balance(UUID, TEXT, NUMERIC, TEXT, TEXT) TO authenticated;