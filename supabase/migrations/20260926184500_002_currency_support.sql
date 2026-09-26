ALTER TABLE public.accounts
  ADD COLUMN currency TEXT NOT NULL DEFAULT 'USD';

ALTER TABLE public.accounts
  ALTER COLUMN currency SET DEFAULT 'PHP',
  ADD CONSTRAINT accounts_currency_iso_code CHECK (currency ~ '^[A-Z]{3}$');

ALTER TABLE public.transactions
  ADD COLUMN currency TEXT NOT NULL DEFAULT 'USD';

ALTER TABLE public.transactions
  ALTER COLUMN currency SET DEFAULT 'PHP',
  ADD CONSTRAINT transactions_currency_iso_code CHECK (currency ~ '^[A-Z]{3}$');