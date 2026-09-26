ALTER TABLE public.accounts
  ADD CONSTRAINT accounts_id_user_id_unique UNIQUE (id, user_id);

ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS transactions_account_id_fkey;

ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_account_owner_fkey
  FOREIGN KEY (account_id, user_id)
  REFERENCES public.accounts (id, user_id)
  ON DELETE CASCADE;