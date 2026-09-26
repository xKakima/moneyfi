"use client";

import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  Bell,
  CircleHelp,
  CreditCard,
  Leaf,
  LogOut,
  Moon,
  Plus,
  Sun,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { useTheme } from "@/components/theme-provider";
import { getSupabaseBrowserClient, getSupabaseConfigurationError } from "@/lib/supabase/client";

type AccountRow = {
  id: string;
  name: string;
  type: string;
  balance: number | string;
};

type TransactionRow = {
  id: string;
  amount: number | string;
  account_id: string | null;
  category: string | null;
  notes: string | null;
  transaction_type: string;
  created_at: string;
};

type DashboardState = {
  userId: string;
  accounts: AccountRow[];
  transactions: TransactionRow[];
  error?: string;
};

const supabase = getSupabaseBrowserClient();
const configurationError = getSupabaseConfigurationError();
const currencyFormatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

function numericValue(value: number | string) {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function formatCurrency(value: number) {
  return currencyFormatter.format(value);
}

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      aria-label={`Switch to ${isDark ? "light" : "dark"} theme`}
      className="icon-button"
      onClick={toggleTheme}
      title={`Switch to ${isDark ? "light" : "dark"} theme`}
      type="button"
    >
      {isDark ? <Sun size={18} strokeWidth={1.8} /> : <Moon size={18} strokeWidth={1.8} />}
    </button>
  );
}

function DashboardHeader({ email, onSignOut }: { email?: string; onSignOut?: () => void }) {
  const initial = email?.trim().charAt(0).toUpperCase() || "A";

  return (
    <header className="border-b border-line bg-surface/85">
      <div className="mx-auto flex h-[72px] max-w-[1320px] items-center justify-between px-5 sm:px-8 lg:px-12">
        <a className="flex items-center gap-2.5" href="#overview" aria-label="Moneyfi home">
          <span className="flex size-9 items-center justify-center rounded-xl bg-accent text-white">
            <Leaf size={19} strokeWidth={2} />
          </span>
          <span className="font-display text-[23px] leading-none tracking-normal text-ink">moneyfi</span>
        </a>

        {email && (
          <nav aria-label="Main navigation" className="hidden items-center gap-8 text-sm font-medium text-muted md:flex">
            <a className="text-ink" href="#overview">Overview</a>
            <a className="transition-colors hover:text-ink" href="#activity">Transactions</a>
            <a className="transition-colors hover:text-ink" href="#accounts">Accounts</a>
          </nav>
        )}

        <div className="flex items-center gap-2 sm:gap-3">
          {email && (
            <button aria-label="Notifications" className="icon-button relative hidden sm:inline-flex" type="button">
              <Bell size={18} strokeWidth={1.8} />
              <span className="absolute right-[9px] top-[8px] size-1.5 rounded-full bg-secondary" />
            </button>
          )}
          <ThemeToggle />
          {email && onSignOut && (
            <>
              <span className="mx-1 hidden h-8 w-px bg-line sm:block" />
              <div className="flex items-center gap-2 rounded-full py-1 pl-1 pr-1.5">
                <span className="flex size-8 items-center justify-center rounded-full bg-secondary-soft text-sm font-semibold text-secondary">{initial}</span>
                <span className="hidden max-w-40 truncate text-sm font-medium text-ink sm:block">{email}</span>
                <button
                  aria-label="Sign out"
                  className="icon-button ml-1 size-8 border-0 bg-transparent"
                  onClick={onSignOut}
                  title="Sign out"
                  type="button"
                >
                  <LogOut size={16} strokeWidth={1.8} />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function AuthPanel({ client }: { client: SupabaseClient }) {
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const result = mode === "sign-in"
        ? await client.auth.signInWithPassword({ email: email.trim(), password })
        : await client.auth.signUp({ email: email.trim(), password });

      if (result.error) {
        setError(result.error.message);
      } else if (mode === "sign-up" && !result.data.session) {
        setMessage("Check your email to confirm your account, then sign in.");
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to connect to Supabase.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-[440px] rounded-xl border border-line bg-surface p-6 shadow-sm sm:p-8">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-accent">Your money, in view</p>
      <h1 className="font-display text-[30px] leading-tight text-ink">{mode === "sign-in" ? "Welcome back" : "Create your account"}</h1>
      <p className="mt-2 text-sm leading-6 text-muted">
        {mode === "sign-in" ? "Sign in to see your accounts and transactions." : "Create a Moneyfi login for your Supabase project."}
      </p>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <label className="block text-sm font-medium text-ink" htmlFor="auth-email">
          Email
          <input
            autoComplete="email"
            className="mt-1.5 h-11 w-full rounded-md border border-line bg-canvas px-3 text-sm text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15"
            id="auth-email"
            onChange={(event) => setEmail(event.target.value)}
            required
            type="email"
            value={email}
          />
        </label>
        <label className="block text-sm font-medium text-ink" htmlFor="auth-password">
          Password
          <input
            autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
            className="mt-1.5 h-11 w-full rounded-md border border-line bg-canvas px-3 text-sm text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15"
            id="auth-password"
            minLength={6}
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />
        </label>
        {error && <p className="rounded-md bg-secondary-soft px-3 py-2.5 text-sm text-ink" role="alert">{error}</p>}
        {message && <p className="rounded-md bg-accent-soft px-3 py-2.5 text-sm text-ink" role="status">{message}</p>}
        <button
          className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-accent px-4 text-sm font-semibold text-white transition hover:brightness-95 disabled:cursor-wait disabled:opacity-60"
          disabled={submitting}
          type="submit"
        >
          {submitting ? "Please wait..." : mode === "sign-in" ? "Sign in" : "Create account"}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-muted">
        {mode === "sign-in" ? "New to Moneyfi?" : "Already have an account?"}{" "}
        <button
          className="font-semibold text-accent hover:underline"
          onClick={() => {
            setMode(mode === "sign-in" ? "sign-up" : "sign-in");
            setError(null);
            setMessage(null);
          }}
          type="button"
        >
          {mode === "sign-in" ? "Create account" : "Sign in"}
        </button>
      </p>
    </section>
  );
}

function SetupNotice({ message }: { message: string }) {
  return (
    <section className="mx-auto max-w-[620px] rounded-xl border border-line bg-surface p-6 shadow-sm sm:p-8">
      <span className="mb-4 flex size-11 items-center justify-center rounded-xl bg-accent-soft text-accent"><Banknote size={20} /></span>
      <h1 className="font-display text-[28px] text-ink">Connect your Supabase project</h1>
      <p className="mt-2 text-sm leading-6 text-muted">{message}</p>
      <p className="mt-5 text-sm leading-6 text-ink">Add these values to <code className="rounded bg-raised px-1.5 py-0.5">frontend/.env.local</code>, then restart the dev server:</p>
      <pre className="mt-3 overflow-x-auto rounded-lg border border-line bg-canvas p-4 text-xs leading-6 text-ink"><code>NEXT_PUBLIC_SUPABASE_URL=...{"\n"}NEXT_PUBLIC_SUPABASE_ANON_KEY=...</code></pre>
      <p className="mt-4 text-xs leading-5 text-muted">Use the project URL and anon or publishable key. Never put a service-role key in a browser app.</p>
    </section>
  );
}

function AddTransactionDialog({
  client,
  userId,
  accounts,
  onClose,
  onSaved,
}: {
  client: SupabaseClient;
  userId: string;
  accounts: AccountRow[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState("");
  const [category, setCategory] = useState("");
  const [notes, setNotes] = useState("");
  const [transactionType, setTransactionType] = useState<"expense" | "income">("expense");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const { error: insertError } = await client.from("transactions").insert({
        user_id: userId,
        account_id: accountId || null,
        amount: parsedAmount,
        category: category.trim() || null,
        transaction_type: transactionType,
        notes: notes.trim() || null,
      });

      if (insertError) {
        setError(insertError.message);
        return;
      }

      onSaved();
      onClose();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to save this transaction.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section aria-labelledby="transaction-dialog-title" aria-modal="true" className="w-full max-w-[480px] rounded-xl border border-line bg-surface p-5 shadow-xl sm:p-6" role="dialog">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-[24px] text-ink" id="transaction-dialog-title">Add transaction</h2>
            <p className="mt-1 text-sm text-muted">This will be saved to your account.</p>
          </div>
          <button aria-label="Close dialog" className="icon-button size-8" onClick={onClose} type="button"><X size={16} /></button>
        </div>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm font-medium text-ink" htmlFor="transaction-type">
              Type
              <select className="mt-1.5 h-11 w-full rounded-md border border-line bg-canvas px-3 text-sm text-ink" id="transaction-type" onChange={(event) => setTransactionType(event.target.value as "expense" | "income")} value={transactionType}>
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </label>
            <label className="block text-sm font-medium text-ink" htmlFor="transaction-amount">
              Amount
              <input className="mt-1.5 h-11 w-full rounded-md border border-line bg-canvas px-3 text-sm text-ink" id="transaction-amount" min="0.01" onChange={(event) => setAmount(event.target.value)} required step="0.01" type="number" value={amount} />
            </label>
          </div>
          <label className="block text-sm font-medium text-ink" htmlFor="transaction-account">
            Account <span className="font-normal text-muted">(optional)</span>
            <select className="mt-1.5 h-11 w-full rounded-md border border-line bg-canvas px-3 text-sm text-ink" id="transaction-account" onChange={(event) => setAccountId(event.target.value)} value={accountId}>
              <option value="">No account</option>
              {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
            </select>
          </label>
          <label className="block text-sm font-medium text-ink" htmlFor="transaction-category">
            Category
            <input className="mt-1.5 h-11 w-full rounded-md border border-line bg-canvas px-3 text-sm text-ink" id="transaction-category" onChange={(event) => setCategory(event.target.value)} placeholder="Groceries, salary..." value={category} />
          </label>
          <label className="block text-sm font-medium text-ink" htmlFor="transaction-notes">
            Notes <span className="font-normal text-muted">(optional)</span>
            <input className="mt-1.5 h-11 w-full rounded-md border border-line bg-canvas px-3 text-sm text-ink" id="transaction-notes" onChange={(event) => setNotes(event.target.value)} value={notes} />
          </label>
          {error && <p className="rounded-md bg-secondary-soft px-3 py-2.5 text-sm text-ink" role="alert">{error}</p>}
          <button className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-accent px-4 text-sm font-semibold text-white transition hover:brightness-95 disabled:cursor-wait disabled:opacity-60" disabled={submitting} type="submit">
            {submitting ? "Saving..." : "Save transaction"}
          </button>
        </form>
      </section>
    </div>
  );
}

export default function DashboardPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(!supabase);
  const [dashboardState, setDashboardState] = useState<DashboardState | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const [showTransactionDialog, setShowTransactionDialog] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    let active = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      setAuthReady(true);
    });

    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setAuthReady(true);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const userId = session?.user.id ?? null;

  useEffect(() => {
    if (!supabase || !userId) return;
    const client = supabase;
    const activeUserId = userId;
    let active = true;

    async function loadDashboard() {
      try {
        const [accountResult, transactionResult] = await Promise.all([
          client.from("accounts").select("id, name, type, balance").eq("user_id", activeUserId),
          client.from("transactions").select("id, amount, account_id, category, notes, transaction_type, created_at").eq("user_id", activeUserId).order("created_at", { ascending: false }).limit(6),
        ]);

        if (!active) return;
        const queryError = accountResult.error ?? transactionResult.error;
        if (queryError) {
          setDashboardState({ userId: activeUserId, accounts: [], transactions: [], error: queryError.message });
          return;
        }

        setDashboardState({
          userId: activeUserId,
          accounts: (accountResult.data ?? []) as AccountRow[],
          transactions: (transactionResult.data ?? []) as TransactionRow[],
        });
      } catch (queryError) {
        if (!active) return;
        setDashboardState({
          userId: activeUserId,
          accounts: [],
          transactions: [],
          error: queryError instanceof Error ? queryError.message : "Unable to load your finance data.",
        });
      }
    }

    void loadDashboard();
    return () => {
      active = false;
    };
  }, [userId, refreshToken]);

  if (configurationError) {
    return (
      <div className="min-h-screen bg-canvas transition-colors duration-300">
        <DashboardHeader />
        <main className="mx-auto max-w-[1320px] px-5 py-12 sm:px-8 lg:px-12 lg:py-16">
          <SetupNotice message={configurationError} />
        </main>
      </div>
    );
  }

  if (!supabase || !authReady) {
    return (
      <div className="min-h-screen bg-canvas transition-colors duration-300">
        <DashboardHeader />
        <main className="mx-auto max-w-[1320px] px-5 py-12 sm:px-8 lg:px-12 lg:py-16">
          <p className="text-center text-sm text-muted">Checking your secure session...</p>
        </main>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-canvas transition-colors duration-300">
        <DashboardHeader />
        <main className="mx-auto max-w-[1320px] px-5 py-12 sm:px-8 lg:px-12 lg:py-16">
          <AuthPanel client={supabase} />
        </main>
      </div>
    );
  }

  const currentData = dashboardState?.userId === session.user.id ? dashboardState : null;
  const accounts = currentData?.accounts ?? [];
  const transactions = currentData?.transactions ?? [];
  const cashAccounts = accounts.filter((account) => account.type === "bank" || account.type === "ewallet");
  const investmentAccounts = accounts.filter((account) => account.type === "investment");
  const creditAccounts = accounts.filter((account) => account.type === "credit_card");
  const metrics = [
    { label: "Cash & savings", accounts: cashAccounts, value: cashAccounts.reduce((total, account) => total + numericValue(account.balance), 0), icon: Wallet, tone: "green" },
    { label: "Investments", accounts: investmentAccounts, value: investmentAccounts.reduce((total, account) => total + numericValue(account.balance), 0), icon: TrendingUp, tone: "pink" },
    { label: "Credit debt", accounts: creditAccounts, value: creditAccounts.reduce((total, account) => total + Math.abs(numericValue(account.balance)), 0), icon: CreditCard, tone: "blue" },
  ] as const;
  const accountNames = new Map(accounts.map((account) => [account.id, account.name]));

  async function signOut() {
    if (supabase) await supabase.auth.signOut();
  }

  return (
    <div className="min-h-screen bg-canvas transition-colors duration-300">
      <DashboardHeader email={session.user.email ?? "Account"} onSignOut={() => { void signOut(); }} />
      <main className="mx-auto max-w-[1320px] px-5 pb-12 pt-8 sm:px-8 sm:pt-11 lg:px-12 lg:pt-14">
        <section aria-labelledby="overview-heading" id="overview">
          <div className="mb-7 flex flex-col gap-5 sm:mb-9 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-accent">Your finances, at a glance</p>
              <h1 className="font-display text-[34px] leading-tight text-ink sm:text-[40px]" id="overview-heading">Overview</h1>
              <p className="mt-2 text-sm text-muted">A little progress, every day.</p>
            </div>
            <button
              className="inline-flex h-11 items-center justify-center gap-2 self-start rounded-lg bg-accent px-4 text-sm font-semibold text-white shadow-sm transition hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-wait disabled:opacity-50 sm:self-auto"
              disabled={!currentData || Boolean(currentData.error)}
              onClick={() => setShowTransactionDialog(true)}
              type="button"
            >
              <Plus size={17} strokeWidth={2.2} />
              Add transaction
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3" id="accounts">
            {metrics.map((metric, index) => {
              const Icon = metric.icon;
              return (
                <article className="dashboard-enter rounded-xl border border-line bg-surface p-5 shadow-[0_2px_12px_rgba(45,55,45,0.025)] transition-colors sm:p-6" key={metric.label} style={{ animationDelay: `${index * 80}ms` }}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted">{metric.label}</p>
                      <p className="mt-4 font-display text-[30px] leading-none tracking-normal text-ink sm:text-[32px]">{currentData && !currentData.error ? formatCurrency(metric.value) : "—"}</p>
                    </div>
                    <span className={`metric-icon metric-icon-${metric.tone}`}><Icon size={19} strokeWidth={1.8} /></span>
                  </div>
                  <p className="mt-5 text-xs text-muted">
                    {currentData && !currentData.error ? `${metric.accounts.length} linked ${metric.accounts.length === 1 ? "account" : "accounts"}` : "Loading accounts..."}
                  </p>
                </article>
              );
            })}
          </div>
        </section>

        <section aria-labelledby="activity-heading" className="mt-8 rounded-xl border border-line bg-surface sm:mt-10" id="activity">
          <div className="flex items-center justify-between border-b border-line px-5 py-5 sm:px-6">
            <div>
              <h2 className="font-display text-[21px] text-ink" id="activity-heading">Recent activity</h2>
              <p className="mt-1 text-xs text-muted">Your latest money movements</p>
            </div>
            <span className="text-xs font-medium text-muted">{currentData?.error ? "Needs attention" : "Latest 6"}</span>
          </div>

          {currentData?.error ? (
            <div className="px-5 py-8 text-center sm:px-6">
              <p className="text-sm font-medium text-ink">Could not load your finance data</p>
              <p className="mt-1 text-xs leading-5 text-muted">{currentData.error}</p>
              <button className="mt-4 text-xs font-semibold text-accent hover:underline" onClick={() => setRefreshToken((value) => value + 1)} type="button">Try again</button>
            </div>
          ) : !currentData ? (
            <div className="flex min-h-[196px] items-center justify-center px-6 text-sm text-muted">Loading your accounts and transactions...</div>
          ) : transactions.length === 0 ? (
            <div className="flex min-h-[196px] flex-col items-center justify-center px-6 py-8 text-center">
              <span className="mb-3 flex size-11 items-center justify-center rounded-full bg-accent-soft text-accent"><Banknote size={20} strokeWidth={1.7} /></span>
              <p className="text-sm font-medium text-ink">No transactions yet</p>
              <p className="mt-1 max-w-xs text-xs leading-5 text-muted">Add your first transaction to start seeing where your money goes.</p>
              <button className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline" onClick={() => setShowTransactionDialog(true)} type="button"><Plus size={14} /> Add a transaction</button>
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {transactions.map((transaction) => {
                const isIncome = transaction.transaction_type === "income";
                const amount = formatCurrency(Math.abs(numericValue(transaction.amount)));
                const title = transaction.category || transaction.notes || (isIncome ? "Income" : "Expense");
                const accountName = transaction.account_id ? accountNames.get(transaction.account_id) : null;

                return (
                  <li className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-5 py-4 sm:gap-4 sm:px-6" key={transaction.id}>
                    <span className={`flex size-10 items-center justify-center rounded-full ${isIncome ? "bg-accent-soft text-accent" : "bg-secondary-soft text-secondary"}`}>
                      {isIncome ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">{title}</p>
                      <p className="mt-1 truncate text-xs text-muted">
                        {new Date(transaction.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        {accountName ? ` · ${accountName}` : " · Unassigned"}
                      </p>
                    </div>
                    <p className={`text-right text-sm font-semibold ${isIncome ? "text-accent" : "text-ink"}`}>
                      {isIncome ? "+" : "−"}{amount}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <footer className="mt-7 flex items-center justify-center gap-1.5 text-xs text-muted">
          <CircleHelp size={14} strokeWidth={1.8} />
          <span>Your finances, thoughtfully in view.</span>
        </footer>
      </main>

      {showTransactionDialog && currentData && !currentData.error && (
        <AddTransactionDialog
          accounts={accounts}
          client={supabase}
          onClose={() => setShowTransactionDialog(false)}
          onSaved={() => setRefreshToken((value) => value + 1)}
          userId={session.user.id}
        />
      )}
    </div>
  );
}