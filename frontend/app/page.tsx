"use client";

import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Banknote,
  CircleHelp,
  Check,
  CreditCard,
  Eye,
  EyeOff,
  Landmark,
  Leaf,
  LogOut,
  Moon,
  Plus,
  Share2,
  Sun,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { AmountInput } from "@/components/amount-input";
import { ShareViewDialog } from "@/components/share-view-dialog";
import { useTheme } from "@/components/theme-provider";
import { currencyOptions, formatCurrency, isValidCurrencyCode } from "@/lib/currency";
import { getSupabaseBrowserClient, getSupabaseConfigurationError } from "@/lib/supabase/client";

type AccountRow = {
  id: string;
  name: string;
  type: string;
  balance: number | string;
  currency: string;
};

type TransactionRow = {
  id: string;
  amount: number | string;
  account_id: string | null;
  category: string | null;
  notes: string | null;
  transaction_type: string;
  currency: string;
  created_at: string;
};

type BalanceSnapshot = {
  id: string;
  account_id: string;
  balance: number | string;
  currency: string;
  created_at: string;
};

type DashboardState = {
  userId: string;
  accounts: AccountRow[];
  transactions: TransactionRow[];
  snapshots: BalanceSnapshot[];
  error?: string;
};

const supabase = getSupabaseBrowserClient();
const configurationError = getSupabaseConfigurationError();
const currencyListId = "moneyfi-currency-list";
const BENEFITS_VISIBILITY_EVENT = "moneyfi-benefits-visibility";

function useBenefitsVisibility(userId: string | undefined) {
  const storageKey = userId ? `moneyfi-benefits-visible:${userId}` : null;
  const visible = useSyncExternalStore(
    (onChange) => {
      if (!storageKey) return () => {};
      const handleStorage = (event: StorageEvent) => {
        if (event.key === storageKey) onChange();
      };
      window.addEventListener("storage", handleStorage);
      window.addEventListener(BENEFITS_VISIBILITY_EVENT, onChange);
      return () => {
        window.removeEventListener("storage", handleStorage);
        window.removeEventListener(BENEFITS_VISIBILITY_EVENT, onChange);
      };
    },
    () => !storageKey || window.localStorage.getItem(storageKey) !== "false",
    () => true,
  );

  function setVisible(nextValue: boolean) {
    if (!storageKey) return;
    window.localStorage.setItem(storageKey, String(nextValue));
    window.dispatchEvent(new Event(BENEFITS_VISIBILITY_EVENT));
  }

  return { visible, setVisible };
}

function numericValue(value: number | string) {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function percentageDifference(current: number, previous: number) {
  return previous === 0 ? null : ((current - previous) / Math.abs(previous)) * 100;
}

function CurrencyCodeInput({
  id,
  value,
  onChange,
  disabled = false,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <>
      <input
        autoCapitalize="characters"
        className="mt-1.5 h-11 w-full rounded-md border border-line bg-canvas px-3 text-sm uppercase text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 disabled:cursor-not-allowed disabled:opacity-65"
        disabled={disabled}
        id={id}
        list={currencyListId}
        maxLength={3}
        onChange={(event) => onChange(event.target.value.toUpperCase())}
        pattern="[A-Z]{3}"
        placeholder="PHP"
        required
        title="Choose a currency or enter a valid three-letter ISO code."
        value={value}
      />
      <datalist id={currencyListId}>
        {currencyOptions.map(([code, name]) => <option key={code} label={`${code} - ${name}`} value={code} />)}
      </datalist>
      {!disabled && <span className="mt-1 block text-xs font-normal text-muted">Asian currencies are listed first; enter another ISO currency code if needed.</span>}
    </>
  );
}

function useEscapeToClose(onClose: () => void) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);
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
    <header className="relative border-b border-line bg-surface/85">
      <div className="mx-auto flex h-[72px] max-w-[1320px] items-center justify-between px-5 sm:px-8 lg:px-12">
        <Link className="flex items-center gap-2.5" href="/" aria-label="Moneyfi home">
          <span className="flex size-9 items-center justify-center rounded-xl bg-accent text-white">
            <Leaf size={19} strokeWidth={2} />
          </span>
          <span className="font-display text-[23px] leading-none tracking-normal text-ink">moneyfi</span>
        </Link>

        {email && (
          <nav aria-label="Main navigation" className="hidden items-center gap-8 text-sm font-medium text-muted md:flex">
            <Link className="text-ink" href="/">Overview</Link>
            <Link className="transition-colors hover:text-ink" href="/transactions">Transactions</Link>
            <Link className="transition-colors hover:text-ink" href="/accounts">Accounts</Link>
            <Link className="transition-colors hover:text-ink" href="/planning">Planning</Link>
          </nav>
        )}

        <div className="flex items-center gap-2 sm:gap-3">
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
      {email && (
        <nav aria-label="Mobile navigation" className="mx-auto grid max-w-[1320px] grid-cols-4 border-t border-line px-5 sm:px-8 md:hidden">
          <Link aria-current="page" className="flex min-h-12 items-center justify-center px-2 text-sm font-medium text-ink" href="/">Overview</Link>
          <Link className="flex min-h-12 items-center justify-center px-2 text-sm font-medium text-muted transition-colors hover:text-ink" href="/transactions">Transactions</Link>
          <Link className="flex min-h-12 items-center justify-center px-2 text-sm font-medium text-muted transition-colors hover:text-ink" href="/accounts">Accounts</Link>
          <Link className="flex min-h-12 items-center justify-center px-2 text-sm font-medium text-muted transition-colors hover:text-ink" href="/planning">Planning</Link>
        </nav>
      )}
    </header>
  );
}

function AuthPanel({ client }: { client: SupabaseClient }) {
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
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
        <div>
          <label className="block text-sm font-medium text-ink" htmlFor="auth-password">Password</label>
          <div className="relative mt-1.5">
            <input
              autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
              className="h-11 w-full rounded-md border border-line bg-canvas px-3 pr-12 text-sm text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15"
              id="auth-password"
              minLength={mode === "sign-up" ? 12 : 6}
              onChange={(event) => setPassword(event.target.value)}
              required
              type={passwordVisible ? "text" : "password"}
              value={password}
            />
            <button
              aria-label={passwordVisible ? "Hide password" : "Show password"}
              className="absolute right-1 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full text-muted hover:bg-raised hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
              onClick={() => setPasswordVisible((visible) => !visible)}
              title={passwordVisible ? "Hide password" : "Show password"}
              type="button"
            >
              {passwordVisible ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>
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
  onSaved: (message: string) => void;
}) {
  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState("");
  const [currency, setCurrency] = useState("PHP");
  const [category, setCategory] = useState("");
  const [notes, setNotes] = useState("");
  const [transactionType, setTransactionType] = useState<"expense" | "income" | "adjustment">("expense");
  const [adjustmentMode, setAdjustmentMode] = useState<"increase" | "decrease" | "current_balance">("increase");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selectedAccount = accounts.find((account) => account.id === accountId);
  const transactionCurrency = selectedAccount?.currency ?? currency;
  const parsedAmount = Number(amount);
  const adjustmentDelta = adjustmentMode === "current_balance" && selectedAccount
    ? parsedAmount - numericValue(selectedAccount.balance)
    : adjustmentMode === "decrease" ? -Math.abs(parsedAmount) : Math.abs(parsedAmount);
  useEscapeToClose(onClose);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const enteredAmount = Number(amount);
    const settingCurrentBalance = transactionType === "adjustment" && adjustmentMode === "current_balance";
    if (!Number.isFinite(enteredAmount) || (settingCurrentBalance ? enteredAmount < 0 : enteredAmount <= 0)) {
      setError(settingCurrentBalance ? "Enter a balance of zero or more." : "Enter an amount greater than zero.");
      return;
    }
    if (transactionType === "adjustment" && !selectedAccount) {
      setError("Choose an account to adjust.");
      return;
    }
    if (!isValidCurrencyCode(transactionCurrency)) {
      setError("Enter a valid three-letter currency code.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      if (transactionType === "adjustment" && selectedAccount) {
        const { data, error: adjustmentError } = await client.rpc("reconcile_account_balance", {
          p_account_id: selectedAccount.id,
          p_amount: enteredAmount,
          p_category: category.trim() || null,
          p_mode: adjustmentMode,
          p_notes: notes.trim() || null,
        });

        if (adjustmentError) {
          setError(adjustmentError.message);
          return;
        }

        const savedDelta = Number(data);
        onSaved(savedDelta === 0
          ? "Account already matches that balance."
          : `Balance adjusted by ${formatCurrency(savedDelta, transactionCurrency)}.`);
        onClose();
        return;
      }

      const { error: insertError } = await client.from("transactions").insert({
        user_id: userId,
        account_id: accountId || null,
        amount: enteredAmount,
        currency: transactionCurrency,
        category: category.trim() || null,
        transaction_type: transactionType,
        notes: notes.trim() || null,
      });

      if (insertError) {
        setError(insertError.message);
        return;
      }

      onSaved("Transaction saved.");
      onClose();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to save this transaction.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section aria-labelledby="transaction-dialog-title" aria-modal="true" className="max-h-[calc(100dvh-2rem)] w-full max-w-[480px] overflow-y-auto rounded-xl border border-line bg-surface p-5 shadow-xl sm:p-6" role="dialog">
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
              <select className="mt-1.5 h-11 w-full rounded-md border border-line bg-canvas px-3 text-sm text-ink" id="transaction-type" onChange={(event) => setTransactionType(event.target.value as "expense" | "income" | "adjustment")} value={transactionType}>
                <option value="expense">Expense</option>
                <option value="income">Income</option>
                <option value="adjustment">Adjustment</option>
              </select>
            </label>
            <label className="block text-sm font-medium text-ink" htmlFor="transaction-amount">
              {transactionType === "adjustment" ? adjustmentMode === "current_balance" ? "Actual current balance" : "Adjustment amount" : "Amount"}
              <input autoFocus className="mt-1.5 h-11 w-full rounded-md border border-line bg-canvas px-3 text-sm text-ink" id="transaction-amount" min={transactionType === "adjustment" && adjustmentMode === "current_balance" ? "0" : "0.01"} onChange={(event) => setAmount(event.target.value)} required step="0.01" type="number" value={amount} />
            </label>
          </div>
          {transactionType === "adjustment" && <>
            <div aria-label="Adjustment method" className="grid grid-cols-3 overflow-hidden rounded-md border border-line" role="group">
              {([ ["increase", "Increase"], ["decrease", "Decrease"], ["current_balance", "Current balance"] ] as const).map(([value, label]) => (
                <button aria-pressed={adjustmentMode === value} className={`min-h-10 px-2 text-xs font-semibold transition-colors ${adjustmentMode === value ? "bg-accent text-white" : "bg-surface text-muted hover:bg-raised"}`} key={value} onClick={() => setAdjustmentMode(value)} type="button">{label}</button>
              ))}
            </div>
            <p className="-mt-2 text-xs leading-5 text-muted">
              {adjustmentMode === "current_balance" ? selectedAccount ? `Current: ${formatCurrency(numericValue(selectedAccount.balance), transactionCurrency)}. ${adjustmentDelta === 0 ? "This account already matches." : `Will record ${formatCurrency(adjustmentDelta, transactionCurrency)} and set the balance to the amount entered.`}` : "Choose an account to compare its saved balance with the actual balance." : `Record one ${adjustmentMode} instead of tracking every small transaction.`}
            </p>
          </>}
          <label className="block text-sm font-medium text-ink" htmlFor="transaction-account">
            Account <span className="font-normal text-muted">{transactionType === "adjustment" ? "(required)" : "(optional)"}</span>
            <select className="mt-1.5 h-11 w-full rounded-md border border-line bg-canvas px-3 text-sm text-ink" id="transaction-account" onChange={(event) => {
              const nextAccountId = event.target.value;
              setAccountId(nextAccountId);
              const nextAccount = accounts.find((account) => account.id === nextAccountId);
              if (nextAccount) setCurrency(nextAccount.currency);
            }} required={transactionType === "adjustment"} value={accountId}>
              <option value="">{transactionType === "adjustment" ? "Choose an account" : "No account"}</option>
              {accounts.map((account) => <option key={account.id} value={account.id}>{account.name} ({account.currency})</option>)}
            </select>
          </label>
          <label className="block text-sm font-medium text-ink" htmlFor="transaction-currency">
            Currency
            <CurrencyCodeInput disabled={Boolean(selectedAccount)} id="transaction-currency" onChange={setCurrency} value={transactionCurrency} />
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

function AddAccountDialog({
  client,
  userId,
  onClose,
  onSaved,
}: {
  client: SupabaseClient;
  userId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState("bank");
  const [balance, setBalance] = useState("");
  const [currency, setCurrency] = useState("PHP");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEscapeToClose(onClose);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const openingBalance = Number(balance.replace(/,/g, ""));
    if (!Number.isFinite(openingBalance)) {
      setError("Enter a valid opening balance.");
      return;
    }
    if (!isValidCurrencyCode(currency)) {
      setError("Enter a valid three-letter currency code.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const { error: insertError } = await client.from("accounts").insert({
        user_id: userId,
        name: name.trim(),
        type,
        balance: openingBalance,
        currency,
      });

      if (insertError) {
        setError(insertError.message);
        return;
      }

      onSaved();
      onClose();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to save this account.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section aria-labelledby="account-dialog-title" aria-modal="true" className="max-h-[calc(100dvh-2rem)] w-full max-w-[440px] overflow-y-auto rounded-xl border border-line bg-surface p-5 shadow-xl sm:p-6" role="dialog">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-[24px] text-ink" id="account-dialog-title">Add account</h2>
            <p className="mt-1 text-sm text-muted">Add a balance to your overview.</p>
          </div>
          <button aria-label="Close dialog" className="icon-button size-8" onClick={onClose} type="button"><X size={16} /></button>
        </div>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm font-medium text-ink" htmlFor="account-name">
            Account name
            <input autoFocus className="mt-1.5 h-11 w-full rounded-md border border-line bg-canvas px-3 text-sm text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/15" id="account-name" maxLength={80} onChange={(event) => setName(event.target.value)} required value={name} />
          </label>
          <label className="block text-sm font-medium text-ink" htmlFor="account-type">
            Account type
            <select className="mt-1.5 h-11 w-full rounded-md border border-line bg-canvas px-3 text-sm text-ink" id="account-type" onChange={(event) => setType(event.target.value)} value={type}>
              <option value="bank">Bank</option>
              <option value="ewallet">E-wallet</option>
              <option value="investment">Investment</option>
              <option value="benefit">Benefits &amp; contributions</option>
              <option value="credit_card">Credit card</option>
            </select>
          </label>
          <label className="block text-sm font-medium text-ink" htmlFor="account-currency">
            Currency
            <CurrencyCodeInput id="account-currency" onChange={setCurrency} value={currency} />
          </label>
          <label className="block text-sm font-medium text-ink" htmlFor="account-balance">
            Current balance
            <AmountInput className="mt-1.5 h-11 w-full rounded-md border border-line bg-canvas px-3 text-sm text-ink" id="account-balance" onChange={setBalance} required value={balance} />
            <span className="mt-1 block text-xs font-normal text-muted">{type === "benefit" ? "Enter your total contributions to date, such as SSS, PhilHealth, or Pag-IBIG." : "For credit cards, enter the amount owed as a positive number."}</span>
          </label>
          {error && <p className="rounded-md bg-secondary-soft px-3 py-2.5 text-sm text-ink" role="alert">{error}</p>}
          <button className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-accent px-4 text-sm font-semibold text-white transition hover:brightness-95 disabled:cursor-wait disabled:opacity-60" disabled={submitting} type="submit">
            {submitting ? "Saving..." : "Save account"}
          </button>
        </form>
      </section>
    </div>
  );
}

function BalanceMovementPanel({ accounts, snapshots, transactions }: { accounts: AccountRow[]; snapshots: BalanceSnapshot[]; transactions: TransactionRow[] }) {
  const [selectedAccountId, setSelectedAccountId] = useState("all");
  const [range, setRange] = useState("90");
  const accountId = selectedAccountId === "all" || accounts.some((account) => account.id === selectedAccountId) ? selectedAccountId : "all";
  const showAllAccounts = accountId === "all";
  const account = accounts.find((item) => item.id === accountId);
  const accountHistory = snapshots
    .filter((snapshot) => !showAllAccounts && snapshot.account_id === accountId)
    .sort((left, right) => new Date(left.created_at).getTime() - new Date(right.created_at).getTime());
  const latestSnapshot = accountHistory[accountHistory.length - 1];
  const previousSnapshot = accountHistory[accountHistory.length - 2];
  const latestChange = latestSnapshot && previousSnapshot
    ? percentageDifference(numericValue(latestSnapshot.balance), numericValue(previousSnapshot.balance))
    : null;
  const accountTransactions = transactions.filter((transaction) => transaction.account_id === accountId && transaction.currency === account?.currency);
  const latestTransaction = accountTransactions[0];
  const previousTransaction = latestTransaction
    ? accountTransactions.slice(1).find((transaction) => transaction.transaction_type === latestTransaction.transaction_type)
    : undefined;
  const transactionChange = latestTransaction && previousTransaction
    ? percentageDifference(numericValue(latestTransaction.amount), numericValue(previousTransaction.amount))
    : null;
  const latestSnapshotTime = Math.max(0, ...snapshots.map((snapshot) => new Date(snapshot.created_at).getTime()));
  const categoryCutoff = range === "all" || !latestSnapshotTime
    ? 0
    : latestSnapshotTime - Number(range) * 24 * 60 * 60 * 1000;
  const categoryLabels: Record<string, string> = {
    bank: "Cash & savings",
    ewallet: "Cash & savings",
    investment: "Investments",
    benefit: "Benefits & contributions",
    credit_card: "Credit debt",
  };
  const categoryMovements = new Map<string, number[]>();
  for (const item of accounts) {
    const history = snapshots
      .filter((snapshot) => snapshot.account_id === item.id)
      .sort((left, right) => new Date(left.created_at).getTime() - new Date(right.created_at).getTime());
    if (history.length < 2) continue;
    const previous = history.filter((snapshot) => new Date(snapshot.created_at).getTime() < categoryCutoff).at(-1);
    const visible = history.filter((snapshot) => new Date(snapshot.created_at).getTime() >= categoryCutoff);
    const baseline = previous ?? visible[0];
    const latest = visible.at(-1);
    if (!latest || latest.id === baseline.id) continue;
    const change = percentageDifference(numericValue(latest.balance), numericValue(baseline.balance));
    if (change === null) continue;
    const label = categoryLabels[item.type] ?? item.type;
    categoryMovements.set(label, [...(categoryMovements.get(label) ?? []), change]);
  }
  const categoryMovementRows = ["Cash & savings", "Investments", "Benefits & contributions", "Credit debt"]
    .map((label) => {
      const changes = categoryMovements.get(label) ?? [];
      return { label, change: changes.length ? changes.reduce((total, value) => total + value, 0) / changes.length : null };
    });
  const cutoff = range === "all" || !latestSnapshot
    ? 0
    : new Date(latestSnapshot.created_at).getTime() - Number(range) * 24 * 60 * 60 * 1000;
  const visibleHistory = accountHistory.filter((snapshot) => new Date(snapshot.created_at).getTime() >= cutoff);
  const values = visibleHistory.map((snapshot) => numericValue(snapshot.balance));
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const padding = Math.max((maxValue - minValue) * 0.15, Math.abs(maxValue) * 0.02, 1);
  const chartMin = minValue - padding;
  const chartMax = maxValue + padding;
  const chartWidth = 720;
  const chartHeight = 220;
  const chartInset = 18;
  const points = visibleHistory.map((snapshot, index) => {
    const x = visibleHistory.length === 1
      ? chartWidth / 2
      : chartInset + (index / (visibleHistory.length - 1)) * (chartWidth - chartInset * 2);
    const y = chartHeight - chartInset - ((numericValue(snapshot.balance) - chartMin) / (chartMax - chartMin)) * (chartHeight - chartInset * 2);
    return { snapshot, x, y };
  });
  const linePoints = points.map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <section aria-labelledby="movement-heading" className="dashboard-enter mt-8 overflow-hidden rounded-xl border border-line bg-surface sm:mt-10" style={{ animationDelay: "220ms" }}>
      <div className="flex flex-col gap-4 border-b border-line px-5 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-accent">Stats</p>
          <h2 className="mt-1 font-display text-[21px] text-ink" id="movement-heading">Balance movement</h2>
          <p className="mt-1 text-xs text-muted">Average balance change by category; currencies stay separate.</p>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(10rem,1fr)_auto]">
          <label className="sr-only" htmlFor="movement-account">Choose account</label>
          <select className="h-10 min-w-0 rounded-md border border-line bg-canvas px-3 text-sm text-ink transition-colors duration-200 focus:border-accent" id="movement-account" onChange={(event) => setSelectedAccountId(event.target.value)} value={accountId}>
            <option value="all">All categories</option>
            {accounts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <div aria-label="Chart time range" className="grid grid-cols-5 overflow-hidden rounded-md border border-line" role="group">
            {[ ["30", "1M"], ["90", "3M"], ["180", "6M"], ["365", "1Y"], ["all", "All"] ].map(([value, label]) => (
              <button aria-pressed={range === value} className={`min-h-10 px-2 text-xs font-semibold transition-colors duration-200 active:scale-[0.97] ${range === value ? "bg-accent text-white" : "bg-surface text-muted hover:bg-raised"}`} key={value} onClick={() => setRange(value)} type="button">{label}</button>
            ))}
          </div>
        </div>
      </div>
      {!accounts.length ? (
        <div className="px-5 py-10 text-center text-sm text-muted">Add an account to start tracking balance movement.</div>
      ) : (
        <div className={showAllAccounts ? "p-5 sm:p-6" : "grid gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_220px]"}>
          <div className="min-w-0">
            {showAllAccounts ? (
              <div className="dashboard-enter grid gap-x-8 gap-y-5 sm:grid-cols-2" key={`${accountId}-${range}`}>
                {categoryMovementRows.map(({ label, change }, index) => (
                  <div className="dashboard-enter" key={label} style={{ animationDelay: `${index * 70}ms` }}>
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="text-sm font-medium text-ink">{label}</p>
                      <p className={`text-sm font-semibold ${change === null ? "text-muted" : change > 0 ? "text-accent" : change < 0 ? "text-secondary" : "text-ink"}`}>
                        {change === null ? "Not enough history" : `${change > 0 ? "+" : ""}${change.toFixed(1)}%`}
                      </p>
                    </div>
                    <div aria-hidden="true" className="mt-2 h-2 overflow-hidden rounded-full bg-raised">
                      {change !== null && <div className={`dashboard-bar-fill h-full rounded-full ${change < 0 ? "bg-secondary" : "bg-accent"}`} style={{ width: `${Math.min(Math.abs(change), 100)}%`, animationDelay: `${index * 90 + 180}ms` }} />}
                    </div>
                  </div>
                ))}
                <p className="text-xs text-muted sm:col-span-2">Average percentage change per account; currencies are not combined.</p>
              </div>
            ) : visibleHistory.length ? (
              <div className="dashboard-enter" key={`${accountId}-${range}`}>
                <div className="mb-2 flex justify-between text-xs text-muted"><span>{formatCurrency(Math.min(...values), account?.currency || "USD")}</span><span>{formatCurrency(Math.max(...values), account?.currency || "USD")}</span></div>
                <svg aria-label={`${account?.name ?? "Account"} balance history`} className="h-auto w-full overflow-visible" role="img" viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
                  <title>{account?.name ?? "Account"} balance history</title>
                  {[0, 1, 2, 3].map((line) => {
                    const y = chartInset + (line / 3) * (chartHeight - chartInset * 2);
                    return <line key={line} stroke="var(--line)" strokeDasharray="4 6" strokeWidth="1" x1={chartInset} x2={chartWidth - chartInset} y1={y} y2={y} />;
                  })}
                  {points.length > 1 && <polyline className="balance-chart-line" fill="none" pathLength={1} points={linePoints} stroke="var(--accent)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />}
                  {points.map(({ snapshot, x, y }, index) => <circle className="balance-chart-point" cx={x} cy={y} fill="var(--surface)" key={snapshot.id} r="5" stroke="var(--accent)" strokeWidth="3" style={{ animationDelay: `${450 + index * 45}ms` }}><title>{`${new Date(snapshot.created_at).toLocaleDateString()} · ${formatCurrency(numericValue(snapshot.balance), snapshot.currency)}`}</title></circle>)}
                </svg>
                <div className="mt-1 flex justify-between text-xs text-muted"><span>{new Date(visibleHistory[0].created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span><span>{new Date(visibleHistory[visibleHistory.length - 1].created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span></div>
              </div>
            ) : (
              <div className="flex min-h-44 items-center justify-center border-y border-dashed border-line px-4 text-center text-sm text-muted">No balance checks in this period. Edit the account balance to record your first movement.</div>
            )}
          </div>
          {!showAllAccounts && <div className="flex flex-row flex-wrap items-center justify-between gap-4 border-t border-line pt-4 lg:flex-col lg:items-start lg:justify-center lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
            <div><p className="text-xs text-muted">Current balance</p><p className="mt-1 font-display text-[22px] text-ink">{account ? formatCurrency(numericValue(account.balance), account.currency || "USD") : "—"}</p></div>
            <div><p className="text-xs text-muted">Change since previous check</p>{latestSnapshot && previousSnapshot && latestChange !== null ? <p className={`mt-1 text-sm font-semibold ${latestChange > 0 ? "text-accent" : latestChange < 0 ? "text-secondary" : "text-muted"}`}>{latestChange > 0 ? "+" : ""}{latestChange.toFixed(1)}% <span className="font-normal text-muted">({formatCurrency(numericValue(latestSnapshot.balance) - numericValue(previousSnapshot.balance), account?.currency || "USD")})</span></p> : <p className="mt-1 text-sm text-muted">{latestSnapshot ? "First balance recorded" : "No history yet"}</p>}</div>
            <div><p className="text-xs text-muted">Latest {latestTransaction?.transaction_type ?? "transaction"} vs previous</p>{latestTransaction && previousTransaction && transactionChange !== null ? <p className="mt-1 text-sm font-semibold text-ink">{transactionChange > 0 ? "+" : ""}{transactionChange.toFixed(1)}% <span className="font-normal text-muted">({formatCurrency(numericValue(latestTransaction.amount) - numericValue(previousTransaction.amount), latestTransaction.currency)})</span></p> : <p className="mt-1 text-sm text-muted">{latestTransaction ? "No comparable transaction" : "No transactions for this account"}</p>}</div>
          </div>}
        </div>
      )}
    </section>
  );
}

export default function DashboardPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(!supabase);
  const [dashboardState, setDashboardState] = useState<DashboardState | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const [showTransactionDialog, setShowTransactionDialog] = useState(false);
  const [showAccountDialog, setShowAccountDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [saveConfirmation, setSaveConfirmation] = useState<string | null>(null);
  const benefitsVisibility = useBenefitsVisibility(session?.user.id);

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
        const [accountResult, transactionResult, snapshotResult] = await Promise.all([
          client.from("accounts").select("id, name, type, balance, currency").eq("user_id", activeUserId),
          client.from("transactions").select("id, amount, account_id, category, notes, transaction_type, currency, created_at").eq("user_id", activeUserId).order("created_at", { ascending: false }).limit(1000),
          client.from("account_balance_snapshots").select("id, account_id, balance, currency, created_at").eq("user_id", activeUserId).order("created_at", { ascending: false }).limit(1000),
        ]);

        if (!active) return;
        const queryError = accountResult.error ?? transactionResult.error ?? snapshotResult.error;
        if (queryError) {
          setDashboardState({ userId: activeUserId, accounts: [], transactions: [], snapshots: [], error: queryError.message });
          return;
        }

        setDashboardState({
          userId: activeUserId,
          accounts: (accountResult.data ?? []) as AccountRow[],
          transactions: (transactionResult.data ?? []) as TransactionRow[],
          snapshots: (snapshotResult.data ?? []) as BalanceSnapshot[],
        });
      } catch (queryError) {
        if (!active) return;
        setDashboardState({
          userId: activeUserId,
          accounts: [],
          transactions: [],
          snapshots: [],
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
  const benefitAccounts = accounts.filter((account) => account.type === "benefit");
  const creditAccounts = accounts.filter((account) => account.type === "credit_card");
  const groupAccountTotals = (entries: AccountRow[], absolute = false) => {
    const totals = new Map<string, number>();
    for (const account of entries) {
      const currency = account.currency || "USD";
      const balance = numericValue(account.balance);
      totals.set(currency, (totals.get(currency) ?? 0) + (absolute ? Math.abs(balance) : balance));
    }
    return Array.from(totals, ([currency, value]) => ({ currency, value }))
      .sort((left, right) => left.currency === "PHP" ? -1 : right.currency === "PHP" ? 1 : left.currency.localeCompare(right.currency));
  };
  const netWorthTotals = new Map<string, number>();
  for (const account of accounts) {
    const currency = account.currency || "USD";
    const balance = numericValue(account.balance);
    const netValue = account.type === "credit_card" ? -Math.abs(balance) : balance;
    netWorthTotals.set(currency, (netWorthTotals.get(currency) ?? 0) + netValue);
  }
  const metrics = [
    { label: "Cash & savings", accounts: cashAccounts, totals: groupAccountTotals(cashAccounts), icon: Wallet, tone: "green" },
    { label: "Investments", accounts: investmentAccounts, totals: groupAccountTotals(investmentAccounts), icon: TrendingUp, tone: "pink" },
    ...(benefitAccounts.length && benefitsVisibility.visible ? [{ label: "Benefits & contributions", accounts: benefitAccounts, totals: groupAccountTotals(benefitAccounts), icon: Landmark, tone: "green" }] : []),
    { label: "Credit debt", accounts: creditAccounts, totals: groupAccountTotals(creditAccounts, true), icon: CreditCard, tone: "blue" },
  ] as const;
  const accountNames = new Map(accounts.map((account) => [account.id, account.name]));

  async function signOut() {
    if (supabase) await supabase.auth.signOut();
  }

  return (
    <div className="min-h-screen bg-canvas transition-colors duration-300">
      <DashboardHeader email={session.user.email ?? "Account"} onSignOut={() => { void signOut(); }} />
      <main className="mx-auto max-w-[1320px] px-5 pb-12 pt-8 sm:px-8 sm:pt-11 lg:px-12 lg:pt-14">
        {saveConfirmation && (
          <div className="mb-5 flex items-center justify-between gap-3 rounded-lg border border-accent/25 bg-accent-soft px-4 py-3 text-sm text-ink" role="status">
            <span className="flex items-center gap-2"><Check className="text-accent" size={17} />{saveConfirmation}</span>
            <button aria-label="Dismiss confirmation" className="text-muted hover:text-ink" onClick={() => setSaveConfirmation(null)} type="button"><X size={16} /></button>
          </div>
        )}
        <section aria-labelledby="overview-heading" id="overview">
          <div className="mb-7 flex flex-col gap-5 sm:mb-9 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-accent">Your finances, at a glance</p>
              <h1 className="font-display text-[34px] leading-tight text-ink sm:text-[40px]" id="overview-heading">Overview</h1>
              <p className="mt-2 text-sm text-muted">A little progress, every day.</p>
            </div>
            <div className="flex flex-wrap gap-2 self-start sm:self-auto">
              {benefitAccounts.length > 0 && (
                <button
                  aria-label={benefitsVisibility.visible ? "Hide benefits summary" : "Show benefits summary"}
                  aria-pressed={benefitsVisibility.visible}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-line bg-surface px-4 text-sm font-semibold text-ink transition hover:bg-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  onClick={() => benefitsVisibility.setVisible(!benefitsVisibility.visible)}
                  title={benefitsVisibility.visible ? "Hide benefits summary" : "Show benefits summary"}
                  type="button"
                >
                  {benefitsVisibility.visible ? <EyeOff size={16} /> : <Eye size={16} />}
                  {benefitsVisibility.visible ? "Hide benefits" : "Show benefits"}
                </button>
              )}
              <button
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-line bg-surface px-4 text-sm font-semibold text-ink transition hover:bg-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-wait disabled:opacity-50"
                disabled={!currentData || Boolean(currentData.error)}
                onClick={() => setShowShareDialog(true)}
                type="button"
              >
                <Share2 size={16} strokeWidth={1.9} />
                Share view
              </button>
              <button
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-line bg-surface px-4 text-sm font-semibold text-ink transition hover:bg-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-wait disabled:opacity-50"
                disabled={!currentData || Boolean(currentData.error)}
                onClick={() => setShowAccountDialog(true)}
                type="button"
              >
                <Wallet size={16} strokeWidth={1.9} />
                Add account
              </button>
              <button
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-accent px-4 text-sm font-semibold text-white shadow-sm transition hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-wait disabled:opacity-50"
                disabled={!currentData || Boolean(currentData.error)}
                onClick={() => setShowTransactionDialog(true)}
                type="button"
              >
                <Plus size={17} strokeWidth={2.2} />
                Add transaction
              </button>
            </div>
          </div>

          <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${benefitAccounts.length > 0 && benefitsVisibility.visible ? "xl:grid-cols-4" : "md:grid-cols-3"}`} id="accounts">
            {metrics.map((metric, index) => {
              const Icon = metric.icon;
              return (
                <Link aria-label={`${metric.label}: view accounts`} className="dashboard-enter group relative min-h-[156px] overflow-hidden rounded-xl border border-line bg-surface p-5 shadow-[0_2px_12px_rgba(45,55,45,0.025)] transition-[transform,border-color,background-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-accent/50 hover:bg-raised hover:shadow-[0_8px_24px_rgba(45,55,45,0.08)] active:translate-y-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:p-6" href="/accounts" key={metric.label} style={{ animationDelay: `${index * 80}ms` }}>
                  <span aria-hidden="true" className="absolute inset-x-0 top-0 h-0.5 bg-accent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted">{metric.label}</p>
                      <div className="mt-3 space-y-1">
                        {currentData && !currentData.error
                          ? (metric.totals.length ? metric.totals : [{ currency: "PHP", value: 0 }]).map((total) => (
                            <p className="font-display text-[25px] leading-tight tracking-normal text-ink sm:text-[27px]" key={total.currency}>
                              {formatCurrency(total.value, total.currency)}
                            </p>
                          ))
                          : <p className="font-display text-[30px] leading-none text-ink">—</p>}
                      </div>
                    </div>
                    <span className={`metric-icon metric-icon-${metric.tone}`}><Icon size={19} strokeWidth={1.8} /></span>
                  </div>
                  <p className="mt-5 flex items-center justify-between gap-2 text-xs text-muted">
                    <span>{currentData && !currentData.error ? `${metric.accounts.length} linked ${metric.accounts.length === 1 ? "account" : "accounts"}` : "Loading accounts..."}</span>
                    <span className="font-semibold text-accent">View accounts</span>
                  </p>
                </Link>
              );
            })}
          </div>
          <section aria-label="Estimated net worth by currency" className="dashboard-enter relative mt-5 overflow-hidden rounded-xl border border-line border-l-[3px] border-l-accent bg-surface px-5 py-5 transition-colors duration-200 hover:bg-raised/50 sm:flex sm:items-center sm:justify-between sm:gap-6 sm:px-6" style={{ animationDelay: "260ms" }}>
            <div className="flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent"><TrendingUp size={19} strokeWidth={1.8} /></span>
              <div><p className="text-xs font-semibold uppercase tracking-[0.08em] text-accent">Overall</p><h2 className="mt-0.5 text-sm font-semibold text-ink">Estimated net worth</h2><p className="mt-1 text-xs text-muted">Assets minus credit-card balances</p></div>
            </div>
            <div className="mt-4 flex flex-wrap items-baseline gap-x-6 gap-y-2 sm:mt-0 sm:justify-end">
              {currentData && !currentData.error && accounts.length ? Array.from(netWorthTotals, ([currency, value]) => <p className="font-display text-[25px] leading-tight tabular-nums text-ink sm:text-[27px]" key={currency}>{formatCurrency(value, currency)}</p>) : <p className="font-display text-[25px] leading-tight text-ink">—</p>}
            </div>
          </section>
        </section>

        {currentData && !currentData.error && <BalanceMovementPanel accounts={accounts} snapshots={currentData.snapshots} transactions={transactions} />}

        <section aria-labelledby="activity-heading" className="dashboard-enter mt-8 rounded-xl border border-line bg-surface sm:mt-10" id="activity" style={{ animationDelay: "340ms" }}>
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
              {transactions.slice(0, 6).map((transaction) => {
                const isIncome = transaction.transaction_type === "income";
                const isAdjustment = transaction.transaction_type === "adjustment";
                const amount = formatCurrency(Math.abs(numericValue(transaction.amount)), transaction.currency || "USD");
                const title = transaction.category || transaction.notes || (isAdjustment ? "Adjustment" : isIncome ? "Income" : "Expense");
                const accountName = transaction.account_id ? accountNames.get(transaction.account_id) : null;

                return (
                  <li className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-5 py-4 transition-colors duration-150 hover:bg-raised/55 sm:gap-4 sm:px-6" key={transaction.id}>
                    <span className={`flex size-10 items-center justify-center rounded-full ${isAdjustment ? "bg-raised text-muted" : isIncome ? "bg-accent-soft text-accent" : "bg-secondary-soft text-secondary"}`}>
                      {isAdjustment ? <ArrowLeftRight size={18} /> : isIncome ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">{title}</p>
                      <p className="mt-1 truncate text-xs text-muted">
                        {new Date(transaction.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        {accountName ? ` · ${accountName}` : " · Unassigned"}
                      </p>
                    </div>
                    <p className={`text-right text-sm font-semibold ${isAdjustment ? "text-muted" : isIncome ? "text-accent" : "text-ink"}`}>
                      {isAdjustment ? numericValue(transaction.amount) < 0 ? "−" : "+" : isIncome ? "+" : "−"}{amount}
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
          onSaved={(message) => {
            setRefreshToken((value) => value + 1);
            setSaveConfirmation(message);
          }}
          userId={session.user.id}
        />
      )}
      {showAccountDialog && currentData && !currentData.error && (
        <AddAccountDialog
          client={supabase}
          onClose={() => setShowAccountDialog(false)}
          onSaved={() => {
            setRefreshToken((value) => value + 1);
            setSaveConfirmation("Account saved.");
          }}
          userId={session.user.id}
        />
      )}
      {showShareDialog && currentData && !currentData.error && (
        <ShareViewDialog
          client={supabase}
          onClose={() => setShowShareDialog(false)}
          userId={session.user.id}
        />
      )}
    </div>
  );
}