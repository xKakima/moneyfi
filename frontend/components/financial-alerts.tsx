"use client";

import { AlertTriangle, Bell, CalendarClock, CircleCheck, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { formatCurrency } from "@/lib/currency";

type Budget = { id: string; category: string; currency: string; monthly_limit: number | string };
type Expense = { amount: number | string; category: string | null; currency: string };
type RecurringCashflow = {
  id: string;
  name: string;
  amount: number | string;
  transaction_type: "income" | "expense";
  currency: string;
  next_due_date: string;
  active: boolean;
};
type AlertPreferences = { bills: boolean; budgets: boolean };
type FinancialAlert = {
  id: string;
  title: string;
  detail: string;
  tone: "warning" | "info";
};

const defaultPreferences: AlertPreferences = { bills: true, budgets: true };
const dayMilliseconds = 24 * 60 * 60 * 1000;

function isAlertPreferences(value: unknown): value is AlertPreferences {
  if (!value || typeof value !== "object") return false;
  const preferences = value as Record<string, unknown>;
  return typeof preferences.bills === "boolean" && typeof preferences.budgets === "boolean";
}

function daysBetweenDates(from: string, to: string) {
  const [fromYear, fromMonth, fromDay] = from.split("-").map(Number);
  const [toYear, toMonth, toDay] = to.split("-").map(Number);
  return Math.round((Date.UTC(toYear, toMonth - 1, toDay) - Date.UTC(fromYear, fromMonth - 1, fromDay)) / dayMilliseconds);
}

function formatDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-PH", { dateStyle: "medium" });
}

export function FinancialAlerts({
  userId,
  budgets,
  recurring,
  monthExpenses,
  today,
}: {
  userId: string;
  budgets: Budget[];
  recurring: RecurringCashflow[];
  monthExpenses: Expense[];
  today: string;
}) {
  const preferencesKey = `moneyfi-financial-alert-preferences:${userId}`;
  const dismissedKey = `moneyfi-dismissed-financial-alerts:${userId}`;
  const [preferences, setPreferences] = useState(defaultPreferences);
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const savedPreferences = window.localStorage.getItem(preferencesKey);
        const savedDismissals = window.localStorage.getItem(dismissedKey);
        let nextPreferences = defaultPreferences;
        let nextDismissals: string[] = [];
        if (savedPreferences) {
          const parsedPreferences: unknown = JSON.parse(savedPreferences);
          if (!isAlertPreferences(parsedPreferences)) throw new Error("Saved alert preferences are invalid.");
          nextPreferences = parsedPreferences;
        }
        if (savedDismissals) {
          const parsedDismissals: unknown = JSON.parse(savedDismissals);
          if (!Array.isArray(parsedDismissals) || !parsedDismissals.every((item) => typeof item === "string")) {
            throw new Error("Saved dismissed alerts are invalid.");
          }
          nextDismissals = parsedDismissals;
        }
        setPreferences(nextPreferences);
        setDismissedAlerts(nextDismissals);
        setStorageError(null);
      } catch (error) {
        setStorageError(error instanceof Error ? error.message : "Could not load your alert preferences.");
      } finally {
        setReady(true);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [dismissedKey, preferencesKey]);

  const alerts = useMemo(() => {
    const currentAlerts: FinancialAlert[] = [];

    if (preferences.bills) {
      for (const bill of recurring) {
        if (!bill.active || bill.transaction_type !== "expense") continue;
        const daysUntilDue = daysBetweenDates(today, bill.next_due_date);
        if (daysUntilDue > 7) continue;

        const title = daysUntilDue < 0
          ? `${bill.name} was due ${formatDate(bill.next_due_date)}`
          : daysUntilDue === 0
            ? `${bill.name} is due today`
            : `${bill.name} is due in ${daysUntilDue} day${daysUntilDue === 1 ? "" : "s"}`;
        const detail = daysUntilDue < 0
          ? `Reminder amount: ${formatCurrency(Number(bill.amount), bill.currency)}. Check whether it has been paid; Moneyfi does not know its payment status.`
          : `Reminder amount: ${formatCurrency(Number(bill.amount), bill.currency)}. This is a reminder, not payment confirmation.`;

        currentAlerts.push({
          id: `bill:${bill.id}:${bill.next_due_date}`,
          title,
          detail,
          tone: daysUntilDue <= 0 ? "warning" : "info",
        });
      }
    }

    if (preferences.budgets) {
      for (const budget of budgets) {
        const spent = monthExpenses.reduce((total, expense) => (
          expense.currency === budget.currency &&
          expense.category?.trim().toLowerCase() === budget.category.trim().toLowerCase()
            ? total + Number(expense.amount)
            : total
        ), 0);
        const limit = Number(budget.monthly_limit);
        if (limit <= 0 || spent < limit * 0.8) continue;

        const exceeded = spent >= limit;
        currentAlerts.push({
          id: `budget:${budget.id}:${today.slice(0, 7)}:${exceeded ? "limit" : "near-limit"}`,
          title: exceeded ? `${budget.category} has reached its budget` : `${budget.category} is nearing its budget`,
          detail: `${formatCurrency(spent, budget.currency)} in recorded expenses this month against ${formatCurrency(limit, budget.currency)}. This only reflects transactions entered in Moneyfi.`,
          tone: exceeded ? "warning" : "info",
        });
      }
    }

    return currentAlerts.sort((left, right) => left.title.localeCompare(right.title));
  }, [budgets, monthExpenses, preferences, recurring, today]);

  const visibleAlerts = alerts.filter((alert) => !dismissedAlerts.includes(alert.id));

  function savePreferences(nextPreferences: AlertPreferences) {
    try {
      window.localStorage.setItem(preferencesKey, JSON.stringify(nextPreferences));
      setPreferences(nextPreferences);
      setStorageError(null);
    } catch (error) {
      setStorageError(error instanceof Error ? error.message : "Could not save your alert preferences.");
    }
  }

  function dismissAlert(alertId: string) {
    const nextDismissed = [...dismissedAlerts, alertId];
    try {
      window.localStorage.setItem(dismissedKey, JSON.stringify(nextDismissed));
      setDismissedAlerts(nextDismissed);
      setStorageError(null);
    } catch (error) {
      setStorageError(error instanceof Error ? error.message : "Could not save the dismissed alert.");
    }
  }

  return (
    <section aria-labelledby="financial-alerts-title" className="overflow-hidden rounded-xl border border-line bg-surface">
      <div className="flex flex-col gap-4 border-b border-line px-5 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-6">
        <div>
          <div className="flex items-center gap-2">
            <Bell className="text-accent" size={18} />
            <h2 className="font-display text-[21px] text-ink" id="financial-alerts-title">Financial alerts</h2>
          </div>
          <p className="mt-1 text-xs leading-5 text-muted">In-app reminders only. Bills due within 7 days and budgets at 80% or more of recorded expenses are flagged. Settings and dismissals are saved in this browser.</p>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-ink">
          <label className="inline-flex items-center gap-2">
            <input checked={preferences.bills} className="size-4 accent-[var(--accent)]" disabled={!ready} onChange={(event) => savePreferences({ ...preferences, bills: event.target.checked })} type="checkbox" />
            Bill reminders
          </label>
          <label className="inline-flex items-center gap-2">
            <input checked={preferences.budgets} className="size-4 accent-[var(--accent)]" disabled={!ready} onChange={(event) => savePreferences({ ...preferences, budgets: event.target.checked })} type="checkbox" />
            Budget alerts
          </label>
        </div>
      </div>

      {storageError && <p className="border-b border-line bg-secondary-soft px-5 py-3 text-xs text-ink sm:px-6" role="alert">Alert settings could not be saved or loaded: {storageError}</p>}
      {!ready ? <p className="px-5 py-6 text-sm text-muted sm:px-6">Loading alert settings...</p> : visibleAlerts.length ? (
        <ul className="divide-y divide-line">
          {visibleAlerts.map((alert) => (
            <li className="flex items-start gap-3 px-5 py-4 sm:px-6" key={alert.id}>
              <span className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full ${alert.tone === "warning" ? "bg-secondary-soft text-secondary" : "bg-accent-soft text-accent"}`}>
                {alert.title.includes("due") ? <CalendarClock size={16} /> : <AlertTriangle size={16} />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink">{alert.title}</p>
                <p className="mt-1 text-xs leading-5 text-muted">{alert.detail}</p>
              </div>
              <button aria-label={`Dismiss alert: ${alert.title}`} className="icon-button size-8 shrink-0" onClick={() => dismissAlert(alert.id)} title="Dismiss alert" type="button"><X size={15} /></button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex items-center gap-2 px-5 py-6 text-sm text-muted sm:px-6">
          <CircleCheck className="text-accent" size={17} />
          <p>No active alerts.</p>
        </div>
      )}
    </section>
  );
}
