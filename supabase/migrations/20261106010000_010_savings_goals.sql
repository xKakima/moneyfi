CREATE TABLE public.savings_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 80),
  target_amount NUMERIC NOT NULL CHECK (target_amount > 0),
  saved_amount NUMERIC NOT NULL DEFAULT 0 CHECK (saved_amount >= 0),
  currency TEXT NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  target_date DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX savings_goals_user_status_created_idx
  ON public.savings_goals (user_id, status, created_at DESC);

ALTER TABLE public.savings_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own savings goals"
  ON public.savings_goals FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own savings goals"
  ON public.savings_goals FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own savings goals"
  ON public.savings_goals FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own savings goals"
  ON public.savings_goals FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

REVOKE ALL ON TABLE public.savings_goals FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.savings_goals TO authenticated;
