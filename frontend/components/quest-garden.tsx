"use client";

import { BookOpenCheck, Check, CircleHelp, PersonStanding, Sparkles } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const supabase = getSupabaseBrowserClient();
const xpPerLevel = 100;

const quests = [
  {
    key: "first_goal",
    title: "Plant your first goal",
    description: "Create a savings goal that reflects something you care about.",
    characterXp: 30,
    petXp: 35,
    cadence: "One time",
    href: "/planning#savings-goals-title",
    requirement: "goal",
  },
  {
    key: "budget_review",
    title: "Check in on your budget",
    description: "Review a category budget and adjust it if your plans changed.",
    characterXp: 20,
    petXp: 25,
    cadence: "Monthly",
    href: "/planning#budgets-title",
    requirement: "budget",
  },
  {
    key: "bill_review",
    title: "Review a reminder",
    description: "Check a bill or income reminder and make sure it still looks right.",
    characterXp: 20,
    petXp: 25,
    cadence: "Monthly",
    href: "/planning#cashflow-title",
    requirement: "reminder",
  },
  {
    key: "transaction_review",
    title: "Look over recent activity",
    description: "Review a recent transaction and update its details if needed.",
    characterXp: 15,
    petXp: 20,
    cadence: "Weekly",
    href: "/transactions",
    requirement: "transaction",
  },
] as const;

type QuestKey = (typeof quests)[number]["key"];
type RpgState = { characterXp: number; petXp: number; completedQuestKeys: QuestKey[] };

function parseRpgState(data: unknown): RpgState | null {
  if (typeof data !== "object" || data === null) return null;
  const result = data as Record<string, unknown>;
  if (typeof result.character_xp !== "number" || typeof result.pet_xp !== "number" ||
    !Array.isArray(result.completed_quest_keys)) return null;
  const completedQuestKeys = result.completed_quest_keys.filter(
    (key): key is QuestKey => typeof key === "string" && quests.some((quest) => quest.key === key),
  );
  return {
    characterXp: result.character_xp,
    petXp: result.pet_xp,
    completedQuestKeys,
  };
}

function LevelProgress({ label, xp, loading }: { label: string; xp: number | null; loading: boolean }) {
  if (xp === null) return <p className="mt-4 text-xs text-muted">{loading ? "Loading progression..." : "Progress unavailable."}</p>;
  const level = Math.floor(xp / xpPerLevel) + 1;
  const progress = xp % xpPerLevel;
  return (
    <div className="mt-4">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-ink">Level {level}</span>
        <span className="text-muted">{progress} / {xpPerLevel} XP to next level</span>
      </div>
      <div aria-label={`${label} level ${level} progress`} aria-valuemax={xpPerLevel} aria-valuemin={0} aria-valuenow={progress} className="mt-2 h-2 overflow-hidden rounded-full bg-raised" role="progressbar">
        <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${progress}%` }} />
      </div>
      <p className="mt-1 text-right text-[11px] text-muted">{xp} total XP</p>
    </div>
  );
}

export function QuestGarden({
  hasGoal,
  hasBudget,
  hasReminder,
  hasTransaction,
  loading,
  error,
}: {
  hasGoal: boolean;
  hasBudget: boolean;
  hasReminder: boolean;
  hasTransaction: boolean;
  loading: boolean;
  error?: string;
}) {
  const [rpgState, setRpgState] = useState<RpgState | null>(null);
  const [stateLoading, setStateLoading] = useState(true);
  const [stateError, setStateError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [completingKey, setCompletingKey] = useState<QuestKey | null>(null);
  const [completionMessage, setCompletionMessage] = useState<string | null>(null);

  const fetchRpgState = useCallback(async () => {
    if (!supabase) {
      throw new Error("RPG quests are unavailable because Supabase is not configured.");
    }
    const { data, error: queryError } = await supabase.rpc("get_rpg_state");
    if (queryError) throw new Error(queryError.message);
    const nextState = parseRpgState(data);
    if (!nextState) {
      throw new Error("The RPG progress response was incomplete. Please try again.");
    }
    return nextState;
  }, []);

  useEffect(() => {
    let active = true;
    void fetchRpgState().then((nextState) => {
      if (active) setRpgState(nextState);
    }).catch((queryError: unknown) => {
      if (active) setStateError(queryError instanceof Error ? queryError.message : "Could not load RPG progress.");
    }).finally(() => {
      if (active) setStateLoading(false);
    });
    return () => { active = false; };
  }, [fetchRpgState]);

  async function reloadRpgState() {
    setStateLoading(true);
    setStateError(null);
    try {
      setRpgState(await fetchRpgState());
    } catch (queryError) {
      setStateError(queryError instanceof Error ? queryError.message : "Could not load RPG progress.");
    } finally {
      setStateLoading(false);
    }
  }

  async function completeQuest(quest: (typeof quests)[number]) {
    if (!supabase) return;
    setCompletingKey(quest.key);
    setActionError(null);
    setCompletionMessage(null);
    try {
      const { error: completionError } = await supabase.rpc("complete_rpg_quest", { p_quest_key: quest.key });
      if (completionError) {
        setActionError(completionError.message);
        return;
      }
      setCompletionMessage(`${quest.title} complete! You earned ${quest.characterXp} XP and your companion earned ${quest.petXp} XP.`);
      await reloadRpgState();
    } catch (completionError) {
      setActionError(completionError instanceof Error ? completionError.message : "Could not complete this quest.");
    } finally {
      setCompletingKey(null);
    }
  }

  const prerequisites: Record<(typeof quests)[number]["requirement"], boolean> = {
    goal: hasGoal,
    budget: hasBudget,
    reminder: hasReminder,
    transaction: hasTransaction,
  };

  return (
    <section aria-labelledby="garden-title" className="dashboard-enter relative isolate overflow-hidden rounded-2xl border border-accent/20 bg-gradient-to-br from-accent-soft via-surface to-raised p-5 shadow-sm sm:p-7">
      <div aria-hidden="true" className="absolute -right-10 -top-14 -z-10 size-48 rounded-full bg-accent/10 blur-2xl" />
      <div className="relative">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-accent"><Sparkles size={15} /> Optional adventure</p>
        <h2 className="mt-2 font-display text-[25px] leading-tight text-ink sm:text-[30px]" id="garden-title">Your little adventure</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Take small steps for your finances, earn experience, and grow alongside your companion. No streaks, penalties, or money movement.</p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <article className="rounded-xl border border-line bg-surface/80 p-4">
            <div className="flex items-center gap-3">
              <span aria-hidden="true" className="flex size-12 items-center justify-center rounded-full bg-accent-soft text-accent"><PersonStanding size={30} strokeWidth={1.6} /></span>
              <div><p className="text-xs font-medium uppercase tracking-wide text-muted">Your character</p><h3 className="mt-0.5 font-display text-xl text-ink">Adventurer</h3></div>
            </div>
            <LevelProgress label="Character" loading={stateLoading} xp={rpgState?.characterXp ?? null} />
          </article>
          <article className="rounded-xl border border-line bg-surface/80 p-4">
            <div className="flex items-center gap-3">
              <span className="flex size-12 items-center justify-center rounded-full bg-secondary-soft text-secondary">
                <svg aria-label="Mossling, your garden companion" className="size-10" role="img" viewBox="0 0 64 64">
                  <path d="M13 25c-4-9 2-17 10-12l7 5c2-1 4-1 6 0l7-5c8-5 14 3 10 12 4 4 6 9 6 14 0 12-10 20-27 20S5 51 5 39c0-5 3-10 8-14Z" fill="currentColor" opacity=".82" transform="translate(4 0)" />
                  <path d="M22 35h.1M42 35h.1" fill="none" stroke="var(--surface)" strokeLinecap="round" strokeWidth="5" />
                  <path d="M28 42c2 2 6 2 8 0" fill="none" stroke="var(--surface)" strokeLinecap="round" strokeWidth="2.5" />
                  <path d="M32 20c-5-5-3-11 2-15 1 5 6 7 4 13" fill="var(--accent)" stroke="var(--surface)" strokeLinejoin="round" strokeWidth="1.5" />
                </svg>
              </span>
              <div><p className="text-xs font-medium uppercase tracking-wide text-muted">Your companion</p><h3 className="mt-0.5 font-display text-xl text-ink">Mossling</h3></div>
            </div>
            <LevelProgress label="Companion" loading={stateLoading} xp={rpgState?.petXp ?? null} />
          </article>
        </div>

        <div className="mt-7 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="font-display text-xl text-ink">Mini quests</h3>
            <p className="mt-1 text-xs text-muted">A few helpful check-ins. Quest rewards are private and never depend on amounts.</p>
          </div>
          <Link className="text-xs font-semibold text-accent hover:underline" href="/planning">Visit your plans</Link>
        </div>

        {loading || stateLoading ? <p className="mt-4 text-sm text-muted">Loading quests and progress...</p> : error || stateError ? (
          <div className="mt-4 rounded-lg border border-secondary/20 bg-secondary-soft p-3 text-sm text-ink" role="alert">
            <p>Could not load your quest board: {error ?? stateError}</p>
            <button className="mt-2 text-xs font-semibold text-accent hover:underline" onClick={() => { void reloadRpgState(); }} type="button">Try again</button>
          </div>
        ) : (
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {quests.map((quest) => {
              const isCompleted = rpgState?.completedQuestKeys.includes(quest.key) ?? false;
              const isAvailable = prerequisites[quest.requirement];
              return (
                <article className="rounded-xl border border-line bg-surface/80 p-4" key={quest.key}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <span className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full ${isCompleted ? "bg-accent-soft text-accent" : "bg-raised text-muted"}`}>
                        {isCompleted ? <Check aria-hidden="true" size={16} /> : <BookOpenCheck aria-hidden="true" size={16} />}
                      </span>
                      <div>
                        <h4 className="text-sm font-semibold text-ink">{quest.title}</h4>
                        <p className="mt-1 text-xs leading-5 text-muted">{quest.description}</p>
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full bg-raised px-2 py-1 text-[10px] font-medium text-muted">{quest.cadence}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
                    <span className="text-[11px] font-medium text-muted">+{quest.characterXp} character XP · +{quest.petXp} pet XP</span>
                    {isCompleted ? <span className="text-xs font-semibold text-accent">{quest.cadence === "One time" ? "Completed" : quest.cadence === "Monthly" ? "Done this month" : "Done this week"}</span> : isAvailable ? (
                      <div className="flex items-center gap-3">
                        <Link className="text-xs font-semibold text-accent hover:underline" href={quest.href}>Review</Link>
                        <button className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-accent px-3 text-xs font-semibold text-white transition hover:brightness-95 disabled:cursor-wait disabled:opacity-60" disabled={completingKey !== null} onClick={() => { void completeQuest(quest); }} type="button">
                          {completingKey === quest.key ? "Saving..." : "Mark complete"}
                        </button>
                      </div>
                    ) : (
                      <Link className="flex items-center gap-1 text-[11px] font-semibold text-accent hover:underline" href={quest.href}><CircleHelp aria-hidden="true" size={13} /> {quest.key === "first_goal" ? "Create a goal" : quest.key === "budget_review" ? "Add a budget" : quest.key === "bill_review" ? "Add a reminder" : "Add a transaction"}</Link>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
        {actionError && <p className="mt-4 rounded-lg border border-secondary/20 bg-secondary-soft px-3 py-2 text-sm text-ink" role="alert">Could not complete quest: {actionError}</p>}
        {completionMessage && <p className="mt-4 rounded-lg border border-accent/20 bg-accent-soft px-3 py-2 text-sm text-ink" role="status">{completionMessage}</p>}
        <p className="mt-4 text-[11px] leading-5 text-muted">Quest completion is self-confirmed; Moneyfi only checks that the relevant item exists. Goal progress is self-reported. Your character and companion are private, and you can turn quests off in Settings.</p>
      </div>
    </section>
  );
}
