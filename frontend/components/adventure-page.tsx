"use client";

import { Leaf, LogOut, Moon, Sparkles, Sun } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { GamificationSettings } from "@/components/gamification-settings";
import { QuestGarden } from "@/components/quest-garden";
import { useTheme } from "@/components/theme-provider";
import { getSupabaseBrowserClient, getSupabaseConfigurationError } from "@/lib/supabase/client";

const supabase = getSupabaseBrowserClient();
const configurationError = getSupabaseConfigurationError();

type QuestAvailability = {
  hasGoal: boolean;
  hasBudget: boolean;
  hasReminder: boolean;
  hasTransaction: boolean;
};

function AdventureHeader({
  session,
  onGamificationChange,
  onSettingsLoaded,
}: {
  session: Session | null;
  onGamificationChange: (enabled: boolean) => void;
  onSettingsLoaded: () => void;
}) {
  const { theme, toggleTheme } = useTheme();
  const nextTheme = theme === "dark" ? "light" : "dark";
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/95 shadow-[0_1px_8px_rgba(30,40,30,0.04)] backdrop-blur-md">
      <div className="mx-auto flex h-[72px] max-w-[1320px] items-center justify-between px-5 sm:px-8 lg:px-12">
        <Link className="flex items-center gap-2.5" href="/" aria-label="Moneyfi overview">
          <span className="flex size-9 items-center justify-center rounded-xl bg-accent text-white"><Leaf size={19} /></span>
          <span className="font-display text-[23px] leading-none text-ink">moneyfi</span>
        </Link>
        {session && (
          <nav aria-label="Main navigation" className="hidden items-center gap-5 text-sm font-medium md:flex">
            <Link className="text-muted transition-colors hover:text-ink" href="/">Overview</Link>
            <Link className="text-muted transition-colors hover:text-ink" href="/transactions">Transactions</Link>
            <Link className="text-muted transition-colors hover:text-ink" href="/accounts">Accounts</Link>
            <Link className="text-muted transition-colors hover:text-ink" href="/planning">Planning</Link>
            <Link aria-current="page" className="text-ink" href="/adventure">Adventure</Link>
          </nav>
        )}
        <div className="flex items-center gap-2">
          {session && <GamificationSettings key={session.user.id} onEnabledChange={onGamificationChange} onSettingsLoaded={onSettingsLoaded} userId={session.user.id} />}
          <button aria-label={`Switch to ${nextTheme} theme`} className="icon-button" onClick={toggleTheme} title={`Switch to ${nextTheme} theme`} type="button">{theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}</button>
          {session && supabase && <button aria-label="Sign out" className="icon-button" onClick={() => { void supabase.auth.signOut(); }} title="Sign out" type="button"><LogOut size={17} /></button>}
        </div>
      </div>
      {session && (
        <nav aria-label="Mobile navigation" className="mx-auto grid max-w-[1320px] grid-cols-5 border-t border-line px-5 sm:px-8 md:hidden">
          <Link className="flex min-h-12 items-center justify-center px-1 text-xs font-medium text-muted sm:text-sm" href="/">Overview</Link>
          <Link className="flex min-h-12 items-center justify-center px-1 text-xs font-medium text-muted sm:text-sm" href="/transactions"><span className="sm:hidden">Activity</span><span className="hidden sm:inline">Transactions</span></Link>
          <Link className="flex min-h-12 items-center justify-center px-1 text-xs font-medium text-muted sm:text-sm" href="/accounts">Accounts</Link>
          <Link className="flex min-h-12 items-center justify-center px-1 text-xs font-medium text-muted sm:text-sm" href="/planning">Planning</Link>
          <Link aria-current="page" className="flex min-h-12 items-center justify-center px-1 text-xs font-medium text-ink sm:text-sm" href="/adventure">Adventure</Link>
        </nav>
      )}
    </header>
  );
}

export function AdventurePage() {
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(!supabase);
  const [gamificationEnabled, setGamificationEnabled] = useState(false);
  const [settingsReady, setSettingsReady] = useState(false);
  const [availability, setAvailability] = useState<QuestAvailability | null>(null);
  const [availabilityUserId, setAvailabilityUserId] = useState<string | null>(null);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const handleSettingsLoaded = useCallback(() => setSettingsReady(true), []);

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      setAuthReady(true);
    });
    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) setAvailabilityError(error.message);
      setSession(data.session);
      setAuthReady(true);
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const loadQuestAvailability = useCallback(async (userId: string): Promise<QuestAvailability> => {
    if (!supabase) throw new Error("Supabase is not configured.");
    const [goal, budget, reminder, transaction] = await Promise.all([
      supabase.from("savings_goals").select("id").eq("user_id", userId).limit(1),
      supabase.from("category_budgets").select("id").eq("user_id", userId).limit(1),
      supabase.from("recurring_cashflows").select("id").eq("user_id", userId).eq("active", true).limit(1),
      supabase.from("transactions").select("id").eq("user_id", userId).limit(1),
    ]);
    const queryError = goal.error ?? budget.error ?? reminder.error ?? transaction.error;
    if (queryError) throw new Error(queryError.message);
    return {
      hasGoal: (goal.data ?? []).length > 0,
      hasBudget: (budget.data ?? []).length > 0,
      hasReminder: (reminder.data ?? []).length > 0,
      hasTransaction: (transaction.data ?? []).length > 0,
    };
  }, []);

  useEffect(() => {
    if (!session || !gamificationEnabled) return;
    const userId = session.user.id;
    let active = true;
    void loadQuestAvailability(userId).then((nextAvailability) => {
      if (!active) return;
      setAvailability(nextAvailability);
      setAvailabilityUserId(userId);
      setAvailabilityError(null);
    }).catch((error: unknown) => {
      if (!active) return;
      setAvailabilityError(error instanceof Error ? error.message : "Could not load quest eligibility.");
      setAvailabilityUserId(userId);
    });
    return () => { active = false; };
  }, [gamificationEnabled, loadQuestAvailability, session]);

  return (
    <div className="min-h-screen bg-canvas">
      <AdventureHeader session={session} onGamificationChange={setGamificationEnabled} onSettingsLoaded={handleSettingsLoaded} />
      <main className="mx-auto max-w-[1120px] px-5 pb-12 pt-8 sm:px-8 sm:pt-11 lg:px-12 lg:pt-14">
        {configurationError ? (
          <section className="rounded-xl border border-line bg-surface p-6">
            <h1 className="font-display text-2xl text-ink">Connect your Supabase project</h1>
            <p className="mt-2 text-sm text-muted">{configurationError}</p>
          </section>
        ) : !supabase || !authReady ? (
          <p className="py-12 text-center text-sm text-muted">Checking your secure session...</p>
        ) : !session ? (
          <section className="mx-auto max-w-xl rounded-2xl border border-line bg-surface p-7 text-center sm:p-10">
            <span className="mx-auto flex size-12 items-center justify-center rounded-xl bg-accent-soft text-accent"><Sparkles size={22} /></span>
            <h1 className="mt-4 font-display text-3xl text-ink">Your adventure awaits</h1>
            <p className="mt-2 text-sm text-muted">Sign in to meet your companion and see your private mini quests.</p>
            <Link className="mt-5 inline-flex h-10 items-center rounded-lg bg-accent px-4 text-sm font-semibold text-white" href="/">Go to sign in</Link>
          </section>
        ) : (
          <>
            <div className="mb-7">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-accent">Your private RPG space</p>
              <h1 className="font-display text-[34px] leading-tight text-ink sm:text-[40px]">Adventure</h1>
              <p className="mt-2 max-w-2xl text-sm text-muted">A separate space for your character, companion, and small quests. Your everyday finance dashboard stays focused on your finances.</p>
            </div>
            {!settingsReady ? (
              <p className="py-12 text-center text-sm text-muted">Loading adventure settings...</p>
            ) : !gamificationEnabled ? (
              <section className="rounded-2xl border border-accent/20 bg-gradient-to-br from-accent-soft via-surface to-raised p-6 sm:p-8">
                <span className="flex size-12 items-center justify-center rounded-xl bg-surface text-accent"><Sparkles size={22} /></span>
                <h2 className="mt-4 font-display text-2xl text-ink">Meet your companion</h2>
                <p className="mt-2 max-w-xl text-sm leading-6 text-muted">Turn on Character & companion quests in Settings to see your adventure board. It is optional, private, and has no streaks or penalties. Your progress is kept if you turn it off.</p>
                <p className="mt-4 text-sm font-semibold text-accent">Open Settings in the top bar to opt in.</p>
              </section>
            ) : availabilityUserId !== session.user.id && !availabilityError ? (
              <p className="py-12 text-center text-sm text-muted">Preparing your quest board...</p>
            ) : (
              <QuestGarden
                error={availabilityError ?? undefined}
                hasBudget={availability?.hasBudget ?? false}
                hasGoal={availability?.hasGoal ?? false}
                hasReminder={availability?.hasReminder ?? false}
                hasTransaction={availability?.hasTransaction ?? false}
                key={session.user.id}
                loading={false}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}
