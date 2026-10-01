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
  const [actionError, setActionError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [updatingCashflowId, setUpdatingCashflowId] = useState<string | null>(null);
  const categories = Array.from(new Set(monthExpenses.map((expense) => expense.category?.trim()).filter((category): category is string => Boolean(category)))).sort();
  const currencies = Array.from(new Set([
    ...currencyOptions.map(([code]) => code),
    ...accounts.map((account) => account.currency),
    ...budgets.map((budget) => budget.currency),
    ...recurring.map((item) => item.currency),
    ...monthExpenses.map((expense) => expense.currency),
  ].filter(Boolean))).sort();
  const upcoming = recurring.filter((item) => item.active).sort((left, right) => left.next_due_date.localeCompare(right.next_due_date));

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