CREATE TABLE public.rpg_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  character_xp INTEGER NOT NULL DEFAULT 0 CHECK (character_xp >= 0),
  pet_xp INTEGER NOT NULL DEFAULT 0 CHECK (pet_xp >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.rpg_quest_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quest_key TEXT NOT NULL CHECK (quest_key IN (
    'first_goal',
    'budget_review',
    'bill_review',
    'transaction_review'
  )),
  period_start DATE NOT NULL,
  character_xp_awarded SMALLINT NOT NULL CHECK (character_xp_awarded > 0),
  pet_xp_awarded SMALLINT NOT NULL CHECK (pet_xp_awarded > 0),
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, quest_key, period_start)
);

ALTER TABLE public.rpg_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rpg_quest_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own RPG profile"
  ON public.rpg_profiles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own RPG quest completions"
  ON public.rpg_quest_completions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

REVOKE ALL ON TABLE public.rpg_profiles, public.rpg_quest_completions FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.rpg_profiles, public.rpg_quest_completions TO authenticated;

CREATE FUNCTION public.ensure_rpg_profile_for_opted_in_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.gamification_enabled THEN
    INSERT INTO public.rpg_profiles (user_id)
    VALUES (NEW.user_id)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_rpg_profile_for_opted_in_user() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER ensure_rpg_profile_after_preference_change
  AFTER INSERT OR UPDATE ON public.user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_rpg_profile_for_opted_in_user();

CREATE FUNCTION public.get_rpg_state()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_profile public.rpg_profiles%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication is required';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM public.user_preferences
    WHERE user_id = v_user_id
      AND gamification_enabled
  ) THEN
    RAISE EXCEPTION 'Enable Character & companion quests in Settings to access RPG progress';
  END IF;

  SELECT * INTO v_profile
  FROM public.rpg_profiles
  WHERE user_id = v_user_id;

  IF NOT FOUND THEN
    INSERT INTO public.rpg_profiles (user_id)
    VALUES (v_user_id)
    RETURNING * INTO v_profile;
  END IF;

  RETURN jsonb_build_object(
    'character_xp', v_profile.character_xp,
    'pet_xp', v_profile.pet_xp,
    'completed_quest_keys', COALESCE((
      SELECT jsonb_agg(DISTINCT quest_key)
      FROM public.rpg_quest_completions
      WHERE user_id = v_user_id
        AND (
          (quest_key = 'first_goal' AND period_start = DATE '2000-01-01')
          OR (quest_key IN ('budget_review', 'bill_review')
            AND period_start = date_trunc('month', CURRENT_DATE::TIMESTAMP)::DATE)
          OR (quest_key = 'transaction_review'
            AND period_start = date_trunc('week', CURRENT_DATE::TIMESTAMP)::DATE)
        )
    ), '[]'::JSONB)
  );
END;
$$;

CREATE FUNCTION public.complete_rpg_quest(p_quest_key TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_period_start DATE;
  v_character_xp SMALLINT;
  v_pet_xp SMALLINT;
  v_completion_id UUID;
  v_profile public.rpg_profiles%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication is required';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM public.user_preferences
    WHERE user_id = v_user_id
      AND gamification_enabled
  ) THEN
    RAISE EXCEPTION 'Enable Character & companion quests in Settings to complete quests';
  END IF;

  CASE p_quest_key
    WHEN 'first_goal' THEN
      v_period_start := DATE '2000-01-01';
      v_character_xp := 30;
      v_pet_xp := 35;
      IF NOT EXISTS (
        SELECT 1 FROM public.savings_goals WHERE user_id = v_user_id
      ) THEN
        RAISE EXCEPTION 'Create a savings goal before completing this quest';
      END IF;
    WHEN 'budget_review' THEN
      v_period_start := date_trunc('month', CURRENT_DATE::TIMESTAMP)::DATE;
      v_character_xp := 20;
      v_pet_xp := 25;
      IF NOT EXISTS (
        SELECT 1 FROM public.category_budgets WHERE user_id = v_user_id
      ) THEN
        RAISE EXCEPTION 'Create a budget before completing this quest';
      END IF;
    WHEN 'bill_review' THEN
      v_period_start := date_trunc('month', CURRENT_DATE::TIMESTAMP)::DATE;
      v_character_xp := 20;
      v_pet_xp := 25;
      IF NOT EXISTS (
        SELECT 1 FROM public.recurring_cashflows WHERE user_id = v_user_id
      ) THEN
        RAISE EXCEPTION 'Add a bill or income reminder before completing this quest';
      END IF;
    WHEN 'transaction_review' THEN
      v_period_start := date_trunc('week', CURRENT_DATE::TIMESTAMP)::DATE;
      v_character_xp := 15;
      v_pet_xp := 20;
      IF NOT EXISTS (
        SELECT 1 FROM public.transactions WHERE user_id = v_user_id
      ) THEN
        RAISE EXCEPTION 'Add a transaction before completing this quest';
      END IF;
    ELSE
      RAISE EXCEPTION 'Unknown quest';
  END CASE;

  INSERT INTO public.rpg_profiles (user_id)
  VALUES (v_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.rpg_quest_completions (
    user_id,
    quest_key,
    period_start,
    character_xp_awarded,
    pet_xp_awarded
  )
  VALUES (
    v_user_id,
    p_quest_key,
    v_period_start,
    v_character_xp,
    v_pet_xp
  )
  ON CONFLICT (user_id, quest_key, period_start) DO NOTHING
  RETURNING id INTO v_completion_id;

  IF v_completion_id IS NULL THEN
    RAISE EXCEPTION 'This quest has already been completed for this period';
  END IF;

  UPDATE public.rpg_profiles
  SET character_xp = character_xp + v_character_xp,
      pet_xp = pet_xp + v_pet_xp,
      updated_at = NOW()
  WHERE user_id = v_user_id
  RETURNING * INTO v_profile;

  RETURN jsonb_build_object(
    'quest_key', p_quest_key,
    'character_xp', v_profile.character_xp,
    'pet_xp', v_profile.pet_xp,
    'character_xp_awarded', v_character_xp,
    'pet_xp_awarded', v_pet_xp
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_rpg_state() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.complete_rpg_quest(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_rpg_state() TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_rpg_quest(TEXT) TO authenticated;
