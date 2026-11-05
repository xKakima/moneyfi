"use client";

import { CalendarClock, Pencil, Plus, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AmountInput } from "@/components/amount-input";
import { currencyOptions, formatCurrency, isValidCurrencyCode } from "@/lib/currency";

type Account = { id: string; name: string; currency: string };
type CategoryBudget = { id: string; category: string; currency: string; monthly_limit: number | string };
type RecurringCashflow = {
  id: string;
  name: string;
  amount: number | string;
  transaction_type: "income" | "expense";
  account_id: string | null;
  category: string | null;
  currency: string;
  frequency: "weekly" | "monthly" | "yearly";
  next_due_date: string;
  active: boolean;
};
type SavingsGoal = {
  id: string;
  name: string;
  target_amount: number | string;
  saved_amount: number | string;
  currency: string;
  target_date: string | null;
  status: "active" | "paused" | "completed";
};
type Expense = { amount: number | string; category: string | null; currency: string };

function nextOccurrence(date: string, frequency: RecurringCashflow["frequency"]) {
  const current = new Date(`${date}T12:00:00`);
  if (frequency === "weekly") current.setDate(current.getDate() + 7);
  else {
    const day = current.getDate();
    const month = current.getMonth() + (frequency === "monthly" ? 1 : 0);
    const year = current.getFullYear() + (frequency === "yearly" ? 1 : month > 11 ? 1 : 0);
    const targetMonth = month % 12;
    const lastDay = new Date(year, targetMonth + 1, 0).getDate();
    current.setFullYear(year, targetMonth, Math.min(day, lastDay));
  }
  return `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}-${String(current.getDate()).padStart(2, "0")}`;
}

export function PlanningWorkspace({
  client,
  userId,
  accounts,
  budgets,
  recurring,
  savingsGoals,
  monthExpenses,
  monthLabel,
  today,
  onChanged,
}: {
  client: SupabaseClient;
  userId: string;
  accounts: Account[];
  budgets: CategoryBudget[];
  recurring: RecurringCashflow[];
  savingsGoals: SavingsGoal[];
  monthExpenses: Expense[];
  monthLabel: string;
  today: string;
  onChanged: () => void;
}) {
  const [budgetCategory, setBudgetCategory] = useState("");
  const [budgetAmount, setBudgetAmount] = useState("");
  const [budgetCurrency, setBudgetCurrency] = useState("PHP");
  const [cashflowId, setCashflowId] = useState<string | null>(null);
  const [cashflowName, setCashflowName] = useState("");
  const [cashflowAmount, setCashflowAmount] = useState("");
  const [cashflowType, setCashflowType] = useState<"income" | "expense">("expense");
  const [cashflowAccountId, setCashflowAccountId] = useState("");
  const [cashflowCategory, setCashflowCategory] = useState("");
  const [cashflowCurrency, setCashflowCurrency] = useState("PHP");
  const [cashflowFrequency, setCashflowFrequency] = useState<"weekly" | "monthly" | "yearly">("monthly");
  const [cashflowDate, setCashflowDate] = useState("");
  const [goalId, setGoalId] = useState<string | null>(null);
  const [goalName, setGoalName] = useState("");
  const [goalTarget, setGoalTarget] = useState("");
  const [goalSaved, setGoalSaved] = useState("0");
  const [goalCurrency, setGoalCurrency] = useState("PHP");
  const [goalDate, setGoalDate] = useState("");
  const [deletingGoal, setDeletingGoal] = useState<SavingsGoal | null>(null);
  const [updatingGoalId, setUpdatingGoalId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [updatingCashflowId, setUpdatingCashflowId] = useState<string | null>(null);
  const categories = Array.from(new Set(monthExpenses.map((expense) => expense.category?.trim()).filter((category): category is string => Boolean(category)))).sort();
  const currencies = Array.from(new Set([
    ...currencyOptions.map(([code]) => code),
    ...accounts.map((account) => account.currency),
    ...budgets.map((budget) => budget.currency),
    ...recurring.map((item) => item.currency),
    ...savingsGoals.map((goal) => goal.currency),
    ...monthExpenses.map((expense) => expense.currency),
  ].filter(Boolean))).sort();
  const upcoming = recurring.filter((item) => item.active).sort((left, right) => left.next_due_date.localeCompare(right.next_due_date));

  function resetGoalForm() {
    setGoalId(null);
    setGoalName("");
    setGoalTarget("");
    setGoalSaved("0");
    setGoalCurrency("PHP");
    setGoalDate("");
  }

  function editGoal(goal: SavingsGoal) {
    setGoalId(goal.id);
    setGoalName(goal.name);
    setGoalTarget(String(goal.target_amount));
    setGoalSaved(String(goal.saved_amount));
    setGoalCurrency(goal.currency);
    setGoalDate(goal.target_date ?? "");
    setActionError(null);
    setDeletingGoal(null);
  }

  async function saveGoal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = goalName.trim();
    const targetAmount = Number(goalTarget.replace(/,/g, ""));
    const savedAmount = Number(goalSaved.replace(/,/g, ""));
    if (!name || name.length > 80 || !Number.isFinite(targetAmount) || targetAmount <= 0 ||
      !Number.isFinite(savedAmount) || savedAmount < 0 || !isValidCurrencyCode(goalCurrency)) {
      setActionError("Enter a name, positive target, non-negative progress, and valid currency.");
      return;
    }

    setSubmitting(true);
    setActionError(null);
    try {
      const payload = {
        name,
        target_amount: targetAmount,
        saved_amount: savedAmount,
        currency: goalCurrency,
        target_date: goalDate || null,
      };
      const result = goalId
        ? await client.from("savings_goals").update(payload).eq("id", goalId).eq("user_id", userId)
        : await client.from("savings_goals").insert({ ...payload, user_id: userId });
      if (result.error) {
        setActionError(result.error.message);
        return;
      }
      resetGoalForm();
      onChanged();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to save this goal.");
    } finally {
      setSubmitting(false);
    }
  }

  async function updateGoalStatus(goal: SavingsGoal, status: SavingsGoal["status"]) {
    setUpdatingGoalId(goal.id);
    setActionError(null);
    try {
      const { error } = await client.from("savings_goals").update({ status }).eq("id", goal.id).eq("user_id", userId);
      if (error) setActionError(error.message);
      else onChanged();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to update this goal.");
    } finally {
      setUpdatingGoalId(null);
    }
  }

  async function removeGoal(goal: SavingsGoal) {
    setUpdatingGoalId(goal.id);
    setActionError(null);
    try {
      const { error } = await client.from("savings_goals").delete().eq("id", goal.id).eq("user_id", userId);
      if (error) setActionError(error.message);
      else {
        if (goalId === goal.id) resetGoalForm();
        setDeletingGoal(null);
        onChanged();
      }
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to delete this goal.");
    } finally {
      setUpdatingGoalId(null);
    }
  }

  async function saveBudget(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const category = budgetCategory.trim();
    const monthlyLimit = Number(budgetAmount.replace(/,/g, ""));
    if (!category || !Number.isFinite(monthlyLimit) || monthlyLimit <= 0 || !isValidCurrencyCode(budgetCurrency)) {
      setActionError("Enter a category, a positive monthly limit, and a valid currency.");
      return;
    }

    setSubmitting(true);
    setActionError(null);
    try {
      const { error } = await client.from("category_budgets").upsert({
        user_id: userId,
        category,
        currency: budgetCurrency,
        monthly_limit: monthlyLimit,
      }, { onConflict: "user_id,category,currency" });
      if (error) {
        setActionError(error.message);
        return;
      }
      setBudgetCategory("");
      setBudgetAmount("");
      onChanged();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to save this budget.");
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteBudget(budgetId: string) {
    const { error } = await client.from("category_budgets").delete().eq("id", budgetId).eq("user_id", userId);
    if (error) setActionError(error.message);
    else onChanged();
  }

  function resetCashflowForm() {
    setCashflowId(null);
    setCashflowName("");
    setCashflowAmount("");
    setCashflowType("expense");
    setCashflowAccountId("");
    setCashflowCategory("");
    setCashflowCurrency("PHP");
    setCashflowFrequency("monthly");
    setCashflowDate("");
  }

  async function saveCashflow(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = Number(cashflowAmount.replace(/,/g, ""));
    if (!cashflowName.trim() || !Number.isFinite(amount) || amount <= 0 || !cashflowDate || !isValidCurrencyCode(cashflowCurrency)) {
      setActionError("Enter a name, positive amount, valid currency, and next due date.");
      return;
    }

    const payload = {
      name: cashflowName.trim(),
      amount,
      transaction_type: cashflowType,
      account_id: cashflowAccountId || null,
      category: cashflowCategory.trim() || null,
      currency: cashflowCurrency,
      frequency: cashflowFrequency,
      next_due_date: cashflowDate,
    };
    setSubmitting(true);
    setActionError(null);
    try {
      const result = cashflowId
        ? await client.from("recurring_cashflows").update(payload).eq("id", cashflowId).eq("user_id", userId)
        : await client.from("recurring_cashflows").insert({ ...payload, user_id: userId });
      if (result.error) {
        setActionError(result.error.message);
        return;
      }
      resetCashflowForm();
      onChanged();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to save this schedule.");
    } finally {
      setSubmitting(false);
    }
  }

  function editCashflow(item: RecurringCashflow) {
    setCashflowId(item.id);
    setCashflowName(item.name);
    setCashflowAmount(String(item.amount));
    setCashflowType(item.transaction_type);
    setCashflowAccountId(item.account_id ?? "");
    setCashflowCategory(item.category ?? "");
    setCashflowCurrency(item.currency);
    setCashflowFrequency(item.frequency);
    setCashflowDate(item.next_due_date);
    setActionError(null);
  }

  async function toggleCashflow(item: RecurringCashflow) {
    const { error } = await client.from("recurring_cashflows").update({ active: !item.active }).eq("id", item.id).eq("user_id", userId);
    if (error) setActionError(error.message);
    else onChanged();
  }

  async function markCashflowHandled(item: RecurringCashflow) {
    let nextDueDate = item.next_due_date;
    do {
      nextDueDate = nextOccurrence(nextDueDate, item.frequency);
    } while (nextDueDate <= today);
    setUpdatingCashflowId(item.id);
    setActionError(null);
    try {
      const { error } = await client.from("recurring_cashflows").update({ next_due_date: nextDueDate }).eq("id", item.id).eq("user_id", userId);
      if (error) setActionError(error.message);
      else onChanged();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to advance this schedule.");
    } finally {
      setUpdatingCashflowId(null);
    }
  }

  async function deleteCashflow(itemId: string) {
    const { error } = await client.from("recurring_cashflows").delete().eq("id", itemId).eq("user_id", userId);
    if (error) setActionError(error.message);
    else {
      if (cashflowId === itemId) resetCashflowForm();
      onChanged();
    }
  }

  return (
    <div className="space-y-8">
      {actionError && <p className="rounded-md bg-secondary-soft px-4 py-3 text-sm text-ink" role="alert">{actionError}</p>}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-line bg-surface p-4"><p className="text-xs text-muted">Monthly budgets</p><p className="mt-1 font-display text-2xl text-ink">{budgets.length}</p></div>
        <div className="rounded-lg border border-line bg-surface p-4"><p className="text-xs text-muted">Active schedules</p><p className="mt-1 font-display text-2xl text-ink">{upcoming.length}</p></div>
        <div className="rounded-lg border border-line bg-surface p-4"><p className="text-xs text-muted">Next due</p><p className="mt-1 text-sm font-semibold text-ink">{upcoming[0] ? `${upcoming[0].name} · ${upcoming[0].next_due_date}` : "Nothing scheduled"}</p></div>
      </div>

      <section aria-labelledby="savings-goals-title" className="overflow-hidden rounded-xl border border-line bg-surface">
        <div className="border-b border-line px-5 py-4 sm:px-6">
          <h2 className="font-display text-[21px] text-ink" id="savings-goals-title">Savings goals</h2>
          <p className="mt-1 text-xs leading-5 text-muted">Track progress toward something that matters to you. Progress is manual and does not move money or represent a separate account.</p>
        </div>
        <form className="grid gap-3 border-b border-line p-5 sm:grid-cols-2 lg:grid-cols-5 sm:px-6" onSubmit={(event) => { void saveGoal(event); }}>
          <label className="block text-sm font-medium text-ink">Goal name<input className="mt-1.5 h-10 w-full rounded-md border border-line bg-canvas px-3 text-sm text-ink" maxLength={80} onChange={(event) => setGoalName(event.target.value)} placeholder="Emergency fund" required value={goalName} /></label>
          <label className="block text-sm font-medium text-ink" htmlFor="savings-goal-target">Target amount<AmountInput className="mt-1.5 h-10 w-full rounded-md border border-line bg-canvas px-3 text-sm text-ink" id="savings-goal-target" onChange={setGoalTarget} required value={goalTarget} /></label>
          <label className="block text-sm font-medium text-ink" htmlFor="savings-goal-saved">Tracked toward goal<AmountInput className="mt-1.5 h-10 w-full rounded-md border border-line bg-canvas px-3 text-sm text-ink" id="savings-goal-saved" onChange={setGoalSaved} required value={goalSaved} /></label>
          <label className="block text-sm font-medium text-ink">Currency<select className="mt-1.5 h-10 w-full rounded-md border border-line bg-canvas px-2 text-sm text-ink" onChange={(event) => setGoalCurrency(event.target.value)} value={goalCurrency}>{currencies.map((currency) => <option key={currency} value={currency}>{currency}</option>)}</select></label>
          <label className="block text-sm font-medium text-ink">Target date <span className="font-normal text-muted">(optional)</span><input className="mt-1.5 h-10 w-full rounded-md border border-line bg-canvas px-3 text-sm text-ink" onChange={(event) => setGoalDate(event.target.value)} type="date" value={goalDate} /></label>
          <p className="text-xs leading-5 text-muted sm:col-span-2 lg:col-span-5">Amounts are self-reported. Moneyfi does not reserve, transfer, or verify funds for this goal.</p>
          <div className="flex gap-2 sm:col-span-2 lg:col-span-5">
            {goalId && <button className="h-10 rounded-md border border-line px-4 text-sm font-semibold text-ink hover:bg-raised" disabled={submitting} onClick={resetGoalForm} type="button">Cancel edit</button>}
            <button className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-accent px-4 text-sm font-semibold text-white disabled:cursor-wait disabled:opacity-60" disabled={submitting} type="submit"><Plus size={16} />{submitting ? "Saving..." : goalId ? "Update goal" : "Add goal"}</button>
          </div>
        </form>
        {savingsGoals.length ? (
          <ul className="divide-y divide-line">
            {savingsGoals.map((goal) => {
              const target = Number(goal.target_amount);
              const saved = Number(goal.saved_amount);
              const progress = target > 0 ? Math.min(100, Math.round(saved / target * 100)) : 0;
              const statusLabel = goal.status === "completed" ? "Completed" : goal.status === "paused" ? "Paused" : "In progress";
              const milestones = [25, 50, 75, 100];
              return (
                <li className="px-5 py-5 sm:px-6" key={goal.id}>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-sm font-semibold text-ink">{goal.name}</h3>
                        <span className="rounded-full bg-raised px-2.5 py-1 text-[11px] font-medium text-muted">{statusLabel}</span>
                      </div>
                      <p className="mt-1 text-xs text-muted">
                        {formatCurrency(saved, goal.currency)} tracked of {formatCurrency(target, goal.currency)} target
                        {goal.target_date ? ` · Target ${new Date(`${goal.target_date}T12:00:00`).toLocaleDateString("en-PH", { dateStyle: "medium" })}` : ""}
                      </p>
                      <div aria-label={`${goal.name} progress: ${progress}%`} aria-valuemax={100} aria-valuemin={0} aria-valuenow={progress} className="mt-3 h-2 overflow-hidden rounded-full bg-raised" role="progressbar">
                        <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${progress}%` }} />
                      </div>
                      <div aria-label="Goal milestones" className="mt-2 flex flex-wrap gap-2">
                        {milestones.map((milestone) => (
                          <span className={`rounded-full px-2 py-1 text-[11px] font-medium ${progress >= milestone ? "bg-accent-soft text-accent" : "bg-canvas text-muted"}`} key={milestone}>
                            {milestone}%{progress >= milestone ? " reached" : ""}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-1 sm:justify-end">
                      <button aria-label={`Edit ${goal.name}`} className="icon-button size-9" disabled={updatingGoalId === goal.id || submitting} onClick={() => editGoal(goal)} title="Edit goal" type="button"><Pencil size={16} /></button>
                      {goal.status !== "completed" ? (
                        <>
                          <button className="h-9 rounded-md px-3 text-xs font-semibold text-ink hover:bg-raised disabled:opacity-50" disabled={updatingGoalId === goal.id || submitting} onClick={() => { void updateGoalStatus(goal, goal.status === "paused" ? "active" : "paused"); }} type="button">{goal.status === "paused" ? "Resume" : "Pause"}</button>
                          <button className="h-9 rounded-md px-3 text-xs font-semibold text-accent hover:bg-accent-soft disabled:opacity-50" disabled={updatingGoalId === goal.id || submitting} onClick={() => { void updateGoalStatus(goal, "completed"); }} type="button">Mark complete</button>
                        </>
                      ) : <button className="h-9 rounded-md px-3 text-xs font-semibold text-ink hover:bg-raised disabled:opacity-50" disabled={updatingGoalId === goal.id || submitting} onClick={() => { void updateGoalStatus(goal, "active"); }} type="button">Reopen</button>}
                      <button aria-label={`Delete ${goal.name}`} className="icon-button size-9 text-secondary" disabled={updatingGoalId === goal.id || submitting} onClick={() => setDeletingGoal(goal)} title="Delete goal" type="button"><Trash2 size={16} /></button>
                    </div>
                  </div>
                  {deletingGoal?.id === goal.id && (
                    <div className="mt-4 flex flex-col gap-3 rounded-lg border border-line bg-canvas p-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm text-ink">Delete this goal and its tracked progress?</p>
                      <div className="flex gap-2">
                        <button className="h-9 rounded-md border border-line px-3 text-xs font-semibold text-ink hover:bg-raised" disabled={updatingGoalId === goal.id} onClick={() => setDeletingGoal(null)} type="button">Cancel</button>
                        <button className="h-9 rounded-md bg-secondary px-3 text-xs font-semibold text-white disabled:opacity-50" disabled={updatingGoalId === goal.id} onClick={() => { void removeGoal(goal); }} type="button">{updatingGoalId === goal.id ? "Deleting..." : "Delete goal"}</button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        ) : <p className="px-5 py-8 text-center text-sm text-muted">No savings goals yet. Add one when you’re ready to track a target.</p>}
      </section>

      <section aria-labelledby="budgets-title" className="overflow-hidden rounded-xl border border-line bg-surface">
        <div className="border-b border-line px-5 py-4 sm:px-6"><h2 className="font-display text-[21px] text-ink" id="budgets-title">Monthly category budgets</h2><p className="mt-1 text-xs text-muted">Recorded expenses for {monthLabel}, grouped by category and currency.</p></div>
        <form className="grid gap-3 border-b border-line p-5 sm:grid-cols-[minmax(0,1fr)_minmax(8rem,0.65fr)_minmax(6rem,0.45fr)_auto] sm:items-end sm:px-6" onSubmit={(event) => { void saveBudget(event); }}>
          <label className="block text-sm font-medium text-ink">Category<input className="mt-1.5 h-10 w-full rounded-md border border-line bg-canvas px-3 text-sm text-ink" list="budget-category-options" maxLength={80} onChange={(event) => setBudgetCategory(event.target.value)} placeholder="Groceries" required value={budgetCategory} /><datalist id="budget-category-options">{categories.map((category) => <option key={category} value={category} />)}</datalist></label>
          <label className="block text-sm font-medium text-ink" htmlFor="budget-monthly-limit">Monthly limit<AmountInput className="mt-1.5 h-10 w-full rounded-md border border-line bg-canvas px-3 text-sm text-ink" id="budget-monthly-limit" onChange={setBudgetAmount} required value={budgetAmount} /></label>
          <label className="block text-sm font-medium text-ink">Currency<select className="mt-1.5 h-10 w-full rounded-md border border-line bg-canvas px-2 text-sm text-ink" onChange={(event) => setBudgetCurrency(event.target.value)} value={budgetCurrency}>{currencies.map((currency) => <option key={currency} value={currency}>{currency}</option>)}</select></label>
          <button className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-accent px-4 text-sm font-semibold text-white disabled:opacity-60" disabled={submitting} type="submit"><Plus size={16} />Save budget</button>
        </form>
        {budgets.length ? <ul className="divide-y divide-line">{budgets.map((budget) => {
          const spent = monthExpenses.reduce((total, expense) => expense.currency === budget.currency && expense.category?.trim().toLowerCase() === budget.category.trim().toLowerCase() ? total + Number(expense.amount) : total, 0);
          const limit = Number(budget.monthly_limit);
          const percent = limit > 0 ? spent / limit * 100 : 0;
          return <li className="grid gap-3 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center sm:px-6" key={budget.id}>
            <div className="min-w-0"><div className="flex items-center justify-between gap-3"><p className="truncate text-sm font-semibold text-ink">{budget.category} <span className="font-normal text-muted">· {budget.currency}</span></p><p className="shrink-0 text-xs text-muted">{formatCurrency(spent, budget.currency)} / {formatCurrency(limit, budget.currency)}</p></div><div aria-label={`${budget.category} budget ${Math.round(percent)} percent used`} aria-valuemax={100} aria-valuemin={0} aria-valuenow={Math.min(100, Math.round(percent))} className="mt-2 h-2 overflow-hidden rounded-full bg-raised" role="progressbar"><div className={`h-full ${percent > 100 ? "bg-secondary" : "bg-accent"}`} style={{ width: `${Math.min(100, percent)}%` }} /></div><p className={`mt-1 text-xs ${percent > 100 ? "font-semibold text-secondary" : "text-muted"}`}>{percent > 100 ? `${formatCurrency(spent - limit, budget.currency)} over limit` : `${Math.round(percent)}% used`}</p></div>
            <button aria-label={`Delete ${budget.category} budget`} className="icon-button size-9 justify-self-end text-secondary" onClick={() => { void deleteBudget(budget.id); }} title="Delete budget" type="button"><Trash2 size={16} /></button>
          </li>;
        })}</ul> : <p className="px-5 py-8 text-center text-sm text-muted">No category budgets yet.</p>}
      </section>

      <section aria-labelledby="cashflow-title" className="overflow-hidden rounded-xl border border-line bg-surface">
        <div className="border-b border-line px-5 py-4 sm:px-6"><h2 className="font-display text-[21px] text-ink" id="cashflow-title">Recurring cash flow</h2><p className="mt-1 text-xs text-muted">Upcoming bills and income are reminders only; they won’t create transactions automatically.</p></div>
        <form className="grid gap-3 border-b border-line p-5 sm:grid-cols-2 lg:grid-cols-4 sm:px-6" onSubmit={(event) => { void saveCashflow(event); }}>
          <label className="block text-sm font-medium text-ink">Name<input className="mt-1.5 h-10 w-full rounded-md border border-line bg-canvas px-3 text-sm text-ink" maxLength={80} onChange={(event) => setCashflowName(event.target.value)} placeholder="Rent, salary..." required value={cashflowName} /></label>
          <label className="block text-sm font-medium text-ink">Type<select className="mt-1.5 h-10 w-full rounded-md border border-line bg-canvas px-3 text-sm text-ink" onChange={(event) => setCashflowType(event.target.value as "income" | "expense")} value={cashflowType}><option value="expense">Bill / expense</option><option value="income">Income</option></select></label>
          <label className="block text-sm font-medium text-ink" htmlFor="cashflow-amount">Amount<AmountInput className="mt-1.5 h-10 w-full rounded-md border border-line bg-canvas px-3 text-sm text-ink" id="cashflow-amount" onChange={setCashflowAmount} required value={cashflowAmount} /></label>
          <label className="block text-sm font-medium text-ink">Currency<select className="mt-1.5 h-10 w-full rounded-md border border-line bg-canvas px-3 text-sm text-ink" onChange={(event) => setCashflowCurrency(event.target.value)} value={cashflowCurrency}>{currencies.map((currency) => <option key={currency} value={currency}>{currency}</option>)}</select></label>
          <label className="block text-sm font-medium text-ink">Frequency<select className="mt-1.5 h-10 w-full rounded-md border border-line bg-canvas px-3 text-sm text-ink" onChange={(event) => setCashflowFrequency(event.target.value as "weekly" | "monthly" | "yearly")} value={cashflowFrequency}><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="yearly">Yearly</option></select></label>
          <label className="block text-sm font-medium text-ink">Next due date<input className="mt-1.5 h-10 w-full rounded-md border border-line bg-canvas px-3 text-sm text-ink" onChange={(event) => setCashflowDate(event.target.value)} required type="date" value={cashflowDate} /></label>
          <label className="block text-sm font-medium text-ink">Account<select className="mt-1.5 h-10 w-full rounded-md border border-line bg-canvas px-3 text-sm text-ink" onChange={(event) => { const value = event.target.value; setCashflowAccountId(value); const account = accounts.find((item) => item.id === value); if (account) setCashflowCurrency(account.currency); }} value={cashflowAccountId}><option value="">No account</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name} ({account.currency})</option>)}</select></label>
          <label className="block text-sm font-medium text-ink">Category <span className="font-normal text-muted">(optional)</span><input className="mt-1.5 h-10 w-full rounded-md border border-line bg-canvas px-3 text-sm text-ink" list="budget-category-options" maxLength={80} onChange={(event) => setCashflowCategory(event.target.value)} value={cashflowCategory} /></label>
          <div className="flex gap-2 sm:col-span-2 lg:col-span-4">{cashflowId && <button className="h-10 rounded-md border border-line px-4 text-sm font-semibold text-ink hover:bg-raised" onClick={resetCashflowForm} type="button">Cancel edit</button>}<button className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-accent px-4 text-sm font-semibold text-white disabled:opacity-60" disabled={submitting} type="submit"><CalendarClock size={16} />{cashflowId ? "Update schedule" : "Add schedule"}</button></div>
        </form>
        {recurring.length ? <ul className="divide-y divide-line">{recurring.map((item) => <li className="grid gap-3 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center sm:px-6" key={item.id}>
          <div className="min-w-0"><p className="truncate text-sm font-semibold text-ink">{item.name} <span className="font-normal text-muted">· {item.transaction_type === "income" ? "Income" : "Bill"}</span></p><p className="mt-1 text-xs text-muted">{formatCurrency(Number(item.amount), item.currency)} · {item.frequency} · due {new Date(`${item.next_due_date}T12:00:00`).toLocaleDateString()}{item.category ? ` · ${item.category}` : ""}{item.active && item.next_due_date < today ? " · overdue" : item.active && item.next_due_date === today ? " · due today" : ""}</p></div>
          <div className="flex flex-wrap items-center justify-end gap-1"><button aria-label={`Edit ${item.name}`} className="icon-button size-9" onClick={() => editCashflow(item)} title="Edit schedule" type="button"><Pencil size={16} /></button><button className="h-9 rounded-md border border-line px-3 text-xs font-semibold text-ink hover:bg-raised" onClick={() => { void toggleCashflow(item); }} type="button">{item.active ? "Pause" : "Resume"}</button>{item.active && <button className="h-9 rounded-md border border-line px-3 text-xs font-semibold text-ink hover:bg-raised disabled:opacity-50" disabled={updatingCashflowId === item.id} onClick={() => { void markCashflowHandled(item); }} type="button">{updatingCashflowId === item.id ? "Updating..." : item.transaction_type === "income" ? "Mark received" : "Mark paid"}</button>}</div>
          <button aria-label={`Delete ${item.name}`} className="icon-button size-9 justify-self-end text-secondary" onClick={() => { void deleteCashflow(item.id); }} title="Delete schedule" type="button"><Trash2 size={16} /></button>
        </li>)}</ul> : <p className="px-5 py-8 text-center text-sm text-muted">No recurring income or bills scheduled.</p>}
      </section>
    </div>
  );
}