"use client";

import { BookOpenCheck, Check, CircleHelp, Compass, PersonStanding, Sparkles, Sprout } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { completeRpgQuest, getRpgState } from "@/lib/rpg-api";

const xpPerLevel = 100;
const questCategories = ["Daily", "Weekly", "Monthly", "One time"] as const;
type QuestCategory = (typeof questCategories)[number];

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
    category: "One time",
  },
  {
    key: "daily_transaction_review",
    title: "A quick activity check",
    description: "Take a moment to review one transaction you have already recorded.",
    characterXp: 5,
    petXp: 5,
    cadence: "Daily",
    href: "/transactions",
    requirement: "transaction",
    category: "Daily",
  },
  {
    key: "daily_reminder_check",
    title: "Check a reminder",
    description: "Quickly check an active bill or income reminder.",
    characterXp: 5,
    petXp: 5,
    cadence: "Daily",
    href: "/planning#cashflow-title",
    requirement: "reminder",
    category: "Daily",
  },
  {
    key: "weekly_goal_checkin",
    title: "Check in with a goal",
    description: "See whether your goal still fits your plans. Update it only if you want to.",
    characterXp: 10,
    petXp: 15,
    cadence: "Weekly",
    href: "/planning#savings-goals-title",
    requirement: "goal",
    category: "Weekly",
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
    category: "Monthly",
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
    category: "Monthly",
  },
  {
    key: "transaction_review",
    title: "Look over recent activity",
    description: "Look over a transaction you have recorded and update its details if needed.",
    characterXp: 15,
    petXp: 20,
    cadence: "Weekly",
    href: "/transactions",
    requirement: "transaction",
    category: "Weekly",
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
  const progressTone = label === "Character"
    ? "from-violet-500 via-indigo-500 to-sky-400"
    : "from-rose-400 via-orange-400 to-amber-300";
  return (
    <div className="mt-4">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-ink">Level {level}</span>
        <span className="text-muted">{progress} / {xpPerLevel} XP to next level</span>
      </div>
      <div aria-label={`${label} level ${level} progress`} aria-valuemax={xpPerLevel} aria-valuemin={0} aria-valuenow={progress} className="mt-2 h-2 overflow-hidden rounded-full bg-raised" role="progressbar">
        <div className={`h-full rounded-full bg-gradient-to-r ${progressTone} transition-[width] duration-700`} style={{ width: `${progress}%` }} />
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
  const [activeCategory, setActiveCategory] = useState<QuestCategory>("Daily");
  const [companionGreeting, setCompanionGreeting] = useState<string | null>(null);

  const fetchRpgState = useCallback(async () => {
    const nextState = parseRpgState(await getRpgState());
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
    setCompletingKey(quest.key);
    setActionError(null);
    setCompletionMessage(null);
    try {
      await completeRpgQuest(quest.key);
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
  const activeQuests = quests.filter((quest) => quest.category === activeCategory);
  const greeting = companionGreeting ?? "Tap me for a little encouragement!";

  return (
    <section aria-labelledby="garden-title" className="dashboard-enter space-y-6">
      <div className="relative isolate overflow-hidden rounded-[2rem] bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-800 px-6 py-7 text-white shadow-xl shadow-emerald-950/10 sm:px-9 sm:py-9">
        <div aria-hidden="true" className="absolute -right-12 -top-16 -z-10 size-64 rounded-full bg-lime-300/20 blur-3xl" />
        <div aria-hidden="true" className="absolute bottom-[-5rem] right-1/4 -z-10 size-48 rounded-full bg-cyan-300/15 blur-3xl" />
        <div className="grid items-center gap-8 sm:grid-cols-[1fr_auto]">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-100"><Sparkles size={14} /> Optional adventure</p>
            <h2 className="mt-5 max-w-xl font-display text-4xl leading-[1.05] sm:text-5xl" id="garden-title">Small steps.<br /><span className="text-lime-200">A little more magic.</span></h2>
            <p className="mt-4 max-w-lg text-sm leading-6 text-emerald-50/80">Take tiny steps for your finances, earn experience, and grow alongside your companion. No streaks, penalties, or money movement.</p>
            <Link className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full bg-lime-300 px-5 text-sm font-bold text-emerald-950 shadow-lg shadow-black/10 transition hover:-translate-y-0.5 hover:bg-lime-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white" href="#quest-board"><Compass size={17} /> Explore quests <span aria-hidden="true">↓</span></Link>
          </div>
          <div className="relative mx-auto flex w-full max-w-[220px] flex-col items-center sm:mr-3">
            <div aria-hidden="true" className="absolute inset-2 rounded-full bg-lime-300/15 blur-2xl" />
            <button aria-label={`Mossling says: ${greeting}`} className="group relative flex size-36 items-center justify-center rounded-full border border-white/25 bg-white/10 shadow-[0_20px_70px_rgba(0,0,0,0.2)] backdrop-blur transition duration-300 hover:scale-105 hover:rotate-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-lime-200 sm:size-44" onClick={() => setCompanionGreeting(companionGreeting ? null : "You’ve got this! Every little step helps us grow.")} type="button">
              <span aria-hidden="true" className="adventure-float">
                <svg className="size-28 drop-shadow-xl sm:size-36" role="img" aria-label="Mossling, your garden companion" viewBox="0 0 64 64">
                  <path d="M13 25c-4-9 2-17 10-12l7 5c2-1 4-1 6 0l7-5c8-5 14 3 10 12 4 4 6 9 6 14 0 12-10 20-27 20S5 51 5 39c0-5 3-10 8-14Z" fill="#a3e635" transform="translate(4 0)" />
                  <path d="M22 35h.1M42 35h.1" fill="none" stroke="#14532d" strokeLinecap="round" strokeWidth="5" />
                  <path d="M28 42c2 2 6 2 8 0" fill="none" stroke="#14532d" strokeLinecap="round" strokeWidth="2.5" />
                  <path d="M32 20c-5-5-3-11 2-15 1 5 6 7 4 13" fill="#4ade80" stroke="#ecfccb" strokeLinejoin="round" strokeWidth="1.5" />
                </svg>
              </span>
              <span aria-hidden="true" className="absolute -right-1 top-1 flex size-9 items-center justify-center rounded-full bg-amber-300 text-amber-950 shadow-lg transition group-hover:-rotate-12"><Sparkles size={17} /></span>
            </button>
            <div aria-live="polite" className="mt-4 rounded-2xl border border-white/15 bg-white/10 px-4 py-2 text-center text-xs font-medium text-emerald-50 backdrop-blur">
              <span className="font-bold text-lime-200">Mossling</span> · {greeting}
            </div>
          </div>
        </div>
        <div aria-hidden="true" className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-lime-300 via-cyan-300 to-fuchsia-300" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <article className="group relative overflow-hidden rounded-3xl border border-violet-200/70 bg-gradient-to-br from-violet-100 via-white to-indigo-100 p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg dark:border-violet-300/10 dark:from-violet-950/50 dark:via-surface dark:to-indigo-950/50 sm:p-6">
          <div aria-hidden="true" className="absolute -right-8 -top-10 size-32 rounded-full bg-violet-300/30 blur-2xl transition group-hover:scale-125" />
          <div className="relative flex items-center gap-4">
            <span aria-hidden="true" className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-lg shadow-violet-500/20"><PersonStanding size={38} strokeWidth={1.5} /></span>
            <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-violet-700 dark:text-violet-300">Your character</p><h3 className="mt-1 font-display text-2xl text-ink">Adventurer</h3><p className="mt-1 text-xs text-muted">Steady steps make a strong hero.</p></div>
          </div>
          <LevelProgress label="Character" loading={stateLoading} xp={rpgState?.characterXp ?? null} />
        </article>
        <article className="group relative overflow-hidden rounded-3xl border border-rose-200/70 bg-gradient-to-br from-rose-100 via-white to-orange-100 p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg dark:border-rose-300/10 dark:from-rose-950/40 dark:via-surface dark:to-orange-950/40 sm:p-6">
          <div aria-hidden="true" className="absolute -right-8 -top-10 size-32 rounded-full bg-rose-300/30 blur-2xl transition group-hover:scale-125" />
          <div className="relative flex items-center gap-4">
            <span aria-hidden="true" className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-400 to-orange-400 text-white shadow-lg shadow-rose-400/20">
              <svg className="size-14" viewBox="0 0 64 64">
                <path d="M13 25c-4-9 2-17 10-12l7 5c2-1 4-1 6 0l7-5c8-5 14 3 10 12 4 4 6 9 6 14 0 12-10 20-27 20S5 51 5 39c0-5 3-10 8-14Z" fill="currentColor" opacity=".88" transform="translate(4 0)" />
                <path d="M22 35h.1M42 35h.1" fill="none" stroke="white" strokeLinecap="round" strokeWidth="5" />
                <path d="M28 42c2 2 6 2 8 0" fill="none" stroke="white" strokeLinecap="round" strokeWidth="2.5" />
                <path d="M32 20c-5-5-3-11 2-15 1 5 6 7 4 13" fill="#a3e635" stroke="white" strokeLinejoin="round" strokeWidth="1.5" />
              </svg>
            </span>
            <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-rose-700 dark:text-rose-300">Your companion</p><h3 className="mt-1 font-display text-2xl text-ink">Mossling</h3><p className="mt-1 text-xs text-muted">Growing right by your side.</p></div>
          </div>
          <LevelProgress label="Companion" loading={stateLoading} xp={rpgState?.petXp ?? null} />
        </article>
      </div>

      <section aria-labelledby="quest-board-title" className="rounded-3xl border border-line bg-surface p-5 shadow-sm sm:p-7" id="quest-board">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-accent"><Sprout size={15} /> Your next small win</p>
            <h3 className="mt-2 font-display text-3xl text-ink" id="quest-board-title">Mini quests</h3>
            <p className="mt-2 max-w-xl text-xs leading-5 text-muted">Little check-ins, one at a time. Skip whenever you like—no streaks or penalties.</p>
          </div>
          <Link className="inline-flex min-h-10 items-center rounded-full border border-line px-4 text-xs font-semibold text-ink transition hover:border-accent/40 hover:bg-accent-soft hover:text-accent" href="/planning">Visit your plans <span aria-hidden="true" className="ml-1">↗</span></Link>
        </div>

        {loading || stateLoading ? <p className="mt-6 text-sm text-muted">Loading quests and progress...</p> : error || stateError ? (
          <div className="mt-5 rounded-2xl border border-secondary/20 bg-secondary-soft p-4 text-sm text-ink" role="alert">
            <p>Could not load your quest board: {error ?? stateError}</p>
            <button className="mt-2 text-xs font-semibold text-accent hover:underline" onClick={() => { void reloadRpgState(); }} type="button">Try again</button>
          </div>
        ) : (
          <>
            <div aria-label="Filter quests by cadence" className="mt-6 flex gap-2 overflow-x-auto pb-2" role="group">
              {questCategories.map((category) => {
                const categoryQuests = quests.filter((quest) => quest.category === category);
                const completedCount = categoryQuests.filter((quest) => rpgState?.completedQuestKeys.includes(quest.key)).length;
                const isActive = activeCategory === category;
                return (
                  <button aria-pressed={isActive} className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full px-4 text-xs font-semibold transition duration-200 hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${isActive ? "bg-emerald-950 text-white shadow-lg shadow-emerald-950/15 dark:bg-lime-300 dark:text-emerald-950" : "border border-line bg-raised/60 text-muted hover:bg-accent-soft hover:text-ink"}`} key={category} onClick={() => setActiveCategory(category)} type="button">
                    {category}<span className={`rounded-full px-1.5 py-0.5 text-[10px] ${isActive ? "bg-white/15 dark:bg-emerald-950/10" : "bg-surface"}`}>{completedCount}/{categoryQuests.length}</span>
                  </button>
                );
              })}
            </div>
            <div className="mt-3 grid gap-3 lg:grid-cols-2" key={activeCategory}>
              {activeQuests.map((quest, index) => {
                const isCompleted = rpgState?.completedQuestKeys.includes(quest.key) ?? false;
                const isAvailable = prerequisites[quest.requirement];
                const cardTone = index % 2 === 0
                  ? "from-sky-50 to-indigo-50/80 dark:from-sky-950/25 dark:to-indigo-950/20"
                  : "from-amber-50 to-rose-50/80 dark:from-amber-950/20 dark:to-rose-950/20";
                return (
                  <article className={`group rounded-2xl border border-line bg-gradient-to-br ${cardTone} p-4 transition duration-200 hover:-translate-y-1 hover:border-accent/30 hover:shadow-lg hover:shadow-ink/5 sm:p-5`} key={quest.key}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <span className={`mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl transition duration-200 group-hover:rotate-3 group-hover:scale-110 ${isCompleted ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20" : index % 2 === 0 ? "bg-sky-200/80 text-sky-800 dark:bg-sky-400/20 dark:text-sky-200" : "bg-amber-200/80 text-amber-800 dark:bg-amber-400/20 dark:text-amber-200"}`}>
                          {isCompleted ? <Check aria-hidden="true" size={18} /> : <BookOpenCheck aria-hidden="true" size={18} />}
                        </span>
                        <div>
                          <h4 className="text-sm font-bold text-ink">{quest.title}</h4>
                          <p className="mt-1 text-xs leading-5 text-muted">{quest.description}</p>
                        </div>
                      </div>
                      <span className="shrink-0 rounded-full border border-white/70 bg-white/70 px-2.5 py-1 text-[10px] font-bold text-muted dark:border-white/10 dark:bg-black/10">{quest.cadence}</span>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-ink/5 pt-3 dark:border-white/10">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-white/65 px-2.5 py-1 text-[10px] font-bold text-violet-700 dark:bg-black/15 dark:text-violet-200"><Sparkles aria-hidden="true" size={12} /> +{quest.characterXp} hero · +{quest.petXp} Mossling XP</span>
                      {isCompleted ? <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-300"><Check size={14} />{quest.cadence === "One time" ? "Completed" : quest.cadence === "Daily" ? "Done today" : `Done this ${quest.cadence.toLowerCase()}`}</span> : isAvailable ? (
                        <div className="flex items-center gap-3">
                          <Link className="text-xs font-semibold text-accent hover:underline" href={quest.href}>Review</Link>
                          <button className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-gradient-to-r from-emerald-700 to-teal-600 px-4 text-xs font-bold text-white shadow-md shadow-emerald-900/15 transition hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-wait disabled:opacity-60 disabled:hover:translate-y-0 dark:from-lime-400 dark:to-emerald-400 dark:text-emerald-950" disabled={completingKey !== null} onClick={() => { void completeQuest(quest); }} type="button">
                            {completingKey === quest.key ? <><span className="size-3 animate-spin rounded-full border-2 border-white/40 border-t-white dark:border-emerald-950/30 dark:border-t-emerald-950" />Saving...</> : <>Mark complete <span aria-hidden="true">✦</span></>}
                          </button>
                        </div>
                      ) : (
                        <Link className="flex items-center gap-1 text-[11px] font-semibold text-accent hover:underline" href={quest.href}><CircleHelp aria-hidden="true" size={13} /> {quest.key === "first_goal" ? "Create a goal" : quest.key === "budget_review" ? "Add a budget" : quest.key === "bill_review" || quest.key === "daily_reminder_check" ? "Add a reminder" : "Add a transaction"}</Link>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}
        {actionError && <p className="mt-4 rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-900 dark:border-rose-300/20 dark:bg-rose-950/30 dark:text-rose-100" role="alert">Could not complete quest: {actionError}</p>}
        {completionMessage && <p className="adventure-pop mt-4 rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900 dark:border-emerald-300/20 dark:bg-emerald-950/30 dark:text-emerald-100" role="status"><Sparkles aria-hidden="true" className="mr-2 inline" size={16} />{completionMessage}</p>}
        <p className="mt-5 text-[11px] leading-5 text-muted">Quest completion is self-confirmed; Moneyfi only checks that the relevant item exists. Goal progress is self-reported. Your character and companion are private, and you can turn quests off in Settings.</p>
      </section>
    </section>
  );
}
