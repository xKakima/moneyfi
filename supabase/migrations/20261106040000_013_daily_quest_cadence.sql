ALTER TABLE public.rpg_quest_completions
  DROP CONSTRAINT IF EXISTS rpg_quest_completions_quest_key_check;

ALTER TABLE public.rpg_quest_completions
  ADD CONSTRAINT rpg_quest_completions_quest_key_check
  CHECK (quest_key IN (
    'first_goal',
    'daily_transaction_review',
    'daily_reminder_check',
    'weekly_goal_checkin',
    'budget_review',
    'bill_review',
    'transaction_review'
  ));

CREATE OR REPLACE FUNCTION public.get_rpg_state()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_profile public.rpg_profiles%ROWTYPE;
  v_today DATE := (NOW() AT TIME ZONE 'Asia/Manila')::DATE;
  v_week_start DATE;
  v_month_start DATE;
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

  v_week_start := date_trunc('week', v_today::TIMESTAMP)::DATE;
  v_month_start := date_trunc('month', v_today::TIMESTAMP)::DATE;

  INSERT INTO public.rpg_profiles (user_id)
  VALUES (v_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO v_profile
  FROM public.rpg_profiles
  WHERE user_id = v_user_id;

  RETURN jsonb_build_object(
    'character_xp', v_profile.character_xp,
    'pet_xp', v_profile.pet_xp,
    'completed_quest_keys', COALESCE((
      SELECT jsonb_agg(DISTINCT quest_key)
      FROM public.rpg_quest_completions
      WHERE user_id = v_user_id
        AND period_start = CASE
          WHEN quest_key = 'first_goal' THEN DATE '2000-01-01'
          WHEN quest_key IN ('daily_transaction_review', 'daily_reminder_check') THEN v_today
          WHEN quest_key IN ('weekly_goal_checkin', 'transaction_review') THEN v_week_start
          WHEN quest_key IN ('budget_review', 'bill_review') THEN v_month_start
        END
    ), '[]'::JSONB)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_rpg_quest(p_quest_key TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_today DATE := (NOW() AT TIME ZONE 'Asia/Manila')::DATE;
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
    WHEN 'daily_transaction_review' THEN
      v_period_start := v_today;
      v_character_xp := 5;
      v_pet_xp := 5;
      IF NOT EXISTS (
        SELECT 1 FROM public.transactions WHERE user_id = v_user_id
      ) THEN
        RAISE EXCEPTION 'Add a transaction before completing this quest';
      END IF;
    WHEN 'daily_reminder_check' THEN
      v_period_start := v_today;
      v_character_xp := 5;
      v_pet_xp := 5;
      IF NOT EXISTS (
        SELECT 1
        FROM public.recurring_cashflows
        WHERE user_id = v_user_id
          AND active
      ) THEN
        RAISE EXCEPTION 'Add an active bill or income reminder before completing this quest';
      END IF;
    WHEN 'weekly_goal_checkin' THEN
      v_period_start := date_trunc('week', v_today::TIMESTAMP)::DATE;
      v_character_xp := 10;
      v_pet_xp := 15;
      IF NOT EXISTS (
        SELECT 1 FROM public.savings_goals WHERE user_id = v_user_id
      ) THEN
        RAISE EXCEPTION 'Create a savings goal before completing this quest';
      END IF;
    WHEN 'budget_review' THEN
      v_period_start := date_trunc('month', v_today::TIMESTAMP)::DATE;
      v_character_xp := 20;
      v_pet_xp := 25;
      IF NOT EXISTS (
        SELECT 1 FROM public.category_budgets WHERE user_id = v_user_id
      ) THEN
        RAISE EXCEPTION 'Create a budget before completing this quest';
      END IF;
    WHEN 'bill_review' THEN
      v_period_start := date_trunc('month', v_today::TIMESTAMP)::DATE;
      v_character_xp := 20;
      v_pet_xp := 25;
      IF NOT EXISTS (
        SELECT 1 FROM public.recurring_cashflows WHERE user_id = v_user_id
      ) THEN
        RAISE EXCEPTION 'Add a bill or income reminder before completing this quest';
      END IF;
    WHEN 'transaction_review' THEN
      v_period_start := date_trunc('week', v_today::TIMESTAMP)::DATE;
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
