CREATE TABLE public.account_balance_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  balance NUMERIC NOT NULL,
  currency TEXT NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX account_balance_snapshots_user_account_created_idx
  ON public.account_balance_snapshots (user_id, account_id, created_at DESC);

ALTER TABLE public.account_balance_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own balance snapshots"
  ON public.account_balance_snapshots FOR SELECT
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.record_account_balance_snapshot()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.balance IS DISTINCT FROM OLD.balance THEN
    INSERT INTO public.account_balance_snapshots (user_id, account_id, balance, currency)
    VALUES (NEW.user_id, NEW.id, NEW.balance, NEW.currency);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER account_balance_snapshot_after_change
  AFTER INSERT OR UPDATE OF balance ON public.accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.record_account_balance_snapshot();

INSERT INTO public.account_balance_snapshots (user_id, account_id, balance, currency)
SELECT user_id, id, balance, currency
FROM public.accounts;