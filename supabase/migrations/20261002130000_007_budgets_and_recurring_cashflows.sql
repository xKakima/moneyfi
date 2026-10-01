CREATE TABLE public.category_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (length(trim(category)) > 0),
  currency TEXT NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  monthly_limit NUMERIC NOT NULL CHECK (monthly_limit > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, category, currency)
);

CREATE INDEX category_budgets_user_idx ON public.category_budgets (user_id);

ALTER TABLE public.category_budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own category budgets"
  ON public.category_budgets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own category budgets"
  ON public.category_budgets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own category budgets"
  ON public.category_budgets FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own category budgets"
  ON public.category_budgets FOR DELETE
  USING (auth.uid() = user_id);

CREATE TABLE public.recurring_cashflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  amount NUMERIC NOT NULL CHECK (amount > 0),
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('income', 'expense')),
  account_id UUID,
  category TEXT,
  currency TEXT NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  frequency TEXT NOT NULL CHECK (frequency IN ('weekly', 'monthly', 'yearly')),
  next_due_date DATE NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (account_id, user_id)
    REFERENCES public.accounts (id, user_id)
    ON DELETE CASCADE
);

CREATE INDEX recurring_cashflows_user_due_idx
  ON public.recurring_cashflows (user_id, next_due_date)
  WHERE active;

ALTER TABLE public.recurring_cashflows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own recurring cashflows"
  ON public.recurring_cashflows FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own recurring cashflows"
  ON public.recurring_cashflows FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own recurring cashflows"
  ON public.recurring_cashflows FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own recurring cashflows"
  ON public.recurring_cashflows FOR DELETE
  USING (auth.uid() = user_id);