"use client";

import { ArrowDownLeft, ArrowUpRight, Banknote, Check, CreditCard, Leaf, LogOut, Moon, Pencil, Search, Sun, Trash2, TrendingUp, Wallet, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { AmountInput } from "@/components/amount-input";
import { useTheme } from "@/components/theme-provider";
import { currencyOptions, formatCurrency, isValidCurrencyCode } from "@/lib/currency";
import { getSupabaseBrowserClient, getSupabaseConfigurationError } from "@/lib/supabase/client";

type Account = { id: string; name: string; type: string; balance: number | string; currency: string };
type Transaction = { id: string; amount: number | string; account_id: string | null; category: string | null; notes: string | null; transaction_type: string; currency: string; created_at: string };
type PageKind = "accounts" | "transactions";

const supabase = getSupabaseBrowserClient();
const configurationError = getSupabaseConfigurationError();
const accountLabels: Record<string, string> = { bank: "Bank", ewallet: "E-wallet", investment: "Investment", credit_card: "Credit card" };

function ThemeButton() {
  const { theme, toggleTheme } = useTheme();
  const nextTheme = theme === "dark" ? "light" : "dark";
  return <button aria-label={`Switch to ${nextTheme} theme`} className="icon-button" onClick={toggleTheme} title={`Switch to ${nextTheme} theme`} type="button">{theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}</button>;
}

function Header({ session, kind }: { session: Session | null; kind: PageKind }) {
  return (
    <header className="relative border-b border-line bg-surface/85">
      <div className="mx-auto flex h-[72px] max-w-[1320px] items-center justify-between px-5 sm:px-8 lg:px-12">
        <Link className="flex items-center gap-2.5" href="/" aria-label="Moneyfi overview">
          <span className="flex size-9 items-center justify-center rounded-xl bg-accent text-white"><Leaf size={19} /></span>
          <span className="font-display text-[23px] leading-none text-ink">moneyfi</span>
        </Link>
        <nav aria-label="Main navigation" className="hidden items-center gap-6 text-sm font-medium md:flex">
          <Link className="text-muted transition-colors hover:text-ink" href="/">Overview</Link>
          <Link aria-current={kind === "transactions" ? "page" : undefined} className={kind === "transactions" ? "text-ink" : "text-muted transition-colors hover:text-ink"} href="/transactions">Transactions</Link>
          <Link aria-current={kind === "accounts" ? "page" : undefined} className={kind === "accounts" ? "text-ink" : "text-muted transition-colors hover:text-ink"} href="/accounts">Accounts</Link>
        </nav>
        <div className="flex items-center gap-2">
          <ThemeButton />
          {session && supabase && <button aria-label="Sign out" className="icon-button" onClick={() => { void supabase.auth.signOut(); }} title="Sign out" type="button"><LogOut size={17} /></button>}
        </div>
      </div>
      {session && <nav aria-label="Mobile navigation" className="mx-auto grid max-w-[1320px] grid-cols-3 border-t border-line px-5 sm:px-8 md:hidden">
        <Link className="flex min-h-12 items-center justify-center px-2 text-sm font-medium text-muted transition-colors hover:text-ink" href="/">Overview</Link>
        <Link aria-current={kind === "transactions" ? "page" : undefined} className={kind === "transactions" ? "flex min-h-12 items-center justify-center px-2 text-sm font-medium text-ink" : "flex min-h-12 items-center justify-center px-2 text-sm font-medium text-muted transition-colors hover:text-ink"} href="/transactions">Transactions</Link>
        <Link aria-current={kind === "accounts" ? "page" : undefined} className={kind === "accounts" ? "flex min-h-12 items-center justify-center px-2 text-sm font-medium text-ink" : "flex min-h-12 items-center justify-center px-2 text-sm font-medium text-muted transition-colors hover:text-ink"} href="/accounts">Accounts</Link>
      </nav>}
    </header>
  );
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return <div className="flex min-h-56 flex-col items-center justify-center px-6 py-10 text-center"><span className="mb-3 flex size-11 items-center justify-center rounded-full bg-accent-soft text-accent"><Banknote size={20} /></span><p className="text-sm font-medium text-ink">{title}</p><p className="mt-1 max-w-sm text-xs leading-5 text-muted">{detail}</p></div>;
}

function AccountList({
  accounts,
  loading,
  client,
  userId,
  onChanged,
}: {
  accounts: Account[];
  loading: boolean;
  client: SupabaseClient;
  userId: string;
  onChanged: () => void;
}) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [currencyFilter, setCurrencyFilter] = useState("all");
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [editingBalance, setEditingBalance] = useState("");
  const [deletingAccount, setDeletingAccount] = useState<Account | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const currencies = Array.from(new Set(accounts.map((account) => account.currency || "USD"))).sort();
  const filtered = accounts.filter((account) => {
    const matchesSearch = `${account.name} ${account.type} ${account.currency}`.toLowerCase().includes(search.trim().toLowerCase());
    const matchesType = typeFilter === "all" || account.type === typeFilter;
    const matchesCurrency = currencyFilter === "all" || (account.currency || "USD") === currencyFilter;
    return matchesSearch && matchesType && matchesCurrency;
  });
  const hasActiveFilters = Boolean(search.trim()) || typeFilter !== "all" || currencyFilter !== "all";
  const grouped = new Map<string, number>();
  for (const account of accounts) {
    const currency = account.currency || "USD";
    grouped.set(currency, (grouped.get(currency) ?? 0) + Number(account.balance || 0));
  }

  function closeDialogs() {
    setEditingAccount(null);
    setDeletingAccount(null);
    setActionError(null);
  }

  useEffect(() => {
    if (!editingAccount && !deletingAccount) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !submitting) closeDialogs();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [editingAccount, deletingAccount, submitting]);

  async function saveAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingAccount) return;
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    const type = String(formData.get("type") ?? "");
    const balance = Number(String(formData.get("balance") ?? "").replace(/,/g, ""));
    const currency = String(formData.get("currency") ?? "").toUpperCase();
    if (!name || !Number.isFinite(balance) || !isValidCurrencyCode(currency)) {
      setActionError("Enter an account name, a valid balance, and a valid three-letter currency code.");
      return;
    }

    setSubmitting(true);
    setActionError(null);
    try {
      const { error } = await client.from("accounts").update({ name, type, balance, currency }).eq("id", editingAccount.id).eq("user_id", userId);
      if (error) {
        setActionError(error.message);
        return;
      }
      closeDialogs();
      setConfirmation("Account updated.");
      onChanged();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to update this account.");
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteAccount() {
    if (!deletingAccount) return;
    setSubmitting(true);
    setActionError(null);
    try {
      const { error } = await client.from("accounts").delete().eq("id", deletingAccount.id).eq("user_id", userId);
      if (error) {
        setActionError(error.message);
        return;
      }
      closeDialogs();
      setConfirmation("Account and its linked transactions deleted.");
      onChanged();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to delete this account.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {confirmation && <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-accent/25 bg-accent-soft px-4 py-3 text-sm text-ink" role="status"><span className="flex items-center gap-2"><Check className="text-accent" size={17} />{confirmation}</span><button aria-label="Dismiss confirmation" className="text-muted hover:text-ink" onClick={() => setConfirmation(null)} type="button"><X size={16} /></button></div>}
      <div className="mb-6 grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2">
        <div className="bg-surface p-5 sm:p-6"><p className="text-sm text-muted">Accounts</p><p className="mt-2 font-display text-3xl text-ink">{loading ? "..." : accounts.length}</p></div>
        <div className="bg-surface p-5 sm:p-6"><p className="text-sm text-muted">Balances by currency</p><div className="mt-2 flex flex-wrap gap-x-5 gap-y-1">
          {loading ? <span className="text-sm text-muted">Loading...</span> : Array.from(grouped, ([currency, total]) => <span className="font-display text-xl text-ink" key={currency}>{formatCurrency(total, currency)}</span>)}
          {!loading && accounts.length === 0 && <span className="text-sm text-muted">No accounts yet</span>}
        </div></div>
      </div>
      <section className="overflow-hidden rounded-xl border border-line bg-surface">
        <div className="border-b border-line px-5 py-4 sm:px-6">
          <div className="flex flex-col gap-3">
            <div><h2 className="font-display text-[21px] text-ink">All accounts</h2><p className="mt-1 text-xs text-muted">Balances shown in each account’s own currency</p></div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(11rem,0.7fr)_minmax(10rem,0.6fr)]">
              <label className="relative block"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} /><input aria-label="Search accounts" className="h-10 w-full rounded-md border border-line bg-canvas pl-9 pr-3 text-sm text-ink outline-none focus:border-accent" onChange={(event) => setSearch(event.target.value)} placeholder="Search accounts" value={search} /></label>
              <select aria-label="Filter by account type" className="h-10 w-full rounded-md border border-line bg-canvas px-3 text-sm text-ink outline-none focus:border-accent" onChange={(event) => setTypeFilter(event.target.value)} value={typeFilter}>
                <option value="all">All account types</option>
                {Object.entries(accountLabels).map(([type, label]) => <option key={type} value={type}>{label}</option>)}
              </select>
              <select aria-label="Filter by currency" className="h-10 w-full rounded-md border border-line bg-canvas px-3 text-sm text-ink outline-none focus:border-accent" onChange={(event) => setCurrencyFilter(event.target.value)} value={currencyFilter}>
                <option value="all">All currencies</option>
                {currencies.map((currency) => <option key={currency} value={currency}>{currency}</option>)}
              </select>
            </div>
            <div className="flex min-h-5 items-center justify-between gap-3 text-xs text-muted">
              <span>{loading ? "Loading accounts..." : `Showing ${filtered.length} of ${accounts.length} accounts`}</span>
              {hasActiveFilters && <button className="font-semibold text-accent hover:underline" onClick={() => { setSearch(""); setTypeFilter("all"); setCurrencyFilter("all"); }} type="button">Clear filters</button>}
            </div>
          </div>
        </div>
        {loading ? <EmptyState title="Loading accounts" detail="Fetching your accounts from Supabase." /> : filtered.length === 0 ? <EmptyState title={accounts.length ? "No matching accounts" : "No accounts yet"} detail={accounts.length ? "Clear filters or adjust your search." : "Add an account from your overview to see it listed here."} /> : (
          <ul className="divide-y divide-line">{filtered.map((account) => {
            const Icon = account.type === "investment" ? TrendingUp : account.type === "credit_card" ? CreditCard : Wallet;
            return (
              <li className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-5 py-4 sm:grid-cols-[auto_minmax(0,1fr)_auto_auto] sm:gap-4 sm:px-6" key={account.id}>
                <span className="flex size-10 items-center justify-center rounded-lg bg-accent-soft text-accent"><Icon size={19} /></span>
                <div className="min-w-0"><p className="truncate text-sm font-semibold text-ink">{account.name}</p><p className="mt-1 text-xs text-muted">{accountLabels[account.type] ?? account.type} · {account.currency || "USD"}</p></div>
                <p className="text-right text-sm font-semibold text-ink">{formatCurrency(Number(account.balance || 0), account.currency || "USD")}</p>
                <div className="col-span-3 flex justify-end gap-1 sm:col-span-1">
                  <button aria-label={`Edit ${account.name}`} className="icon-button size-9" onClick={() => { setActionError(null); setEditingBalance(String(account.balance)); setEditingAccount(account); }} title="Edit account" type="button"><Pencil size={16} /></button>
                  <button aria-label={`Delete ${account.name}`} className="icon-button size-9 text-secondary" onClick={() => { setActionError(null); setDeletingAccount(account); }} title="Delete account" type="button"><Trash2 size={16} /></button>
                </div>
              </li>
            );
          })}</ul>
        )}
      </section>
      {editingAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !submitting) closeDialogs(); }}>
          <section aria-labelledby="edit-account-title" aria-modal="true" className="max-h-[calc(100dvh-2rem)] w-full max-w-[440px] overflow-y-auto rounded-xl border border-line bg-surface p-5 shadow-xl sm:p-6" role="dialog">
            <div className="mb-5 flex items-start justify-between gap-4"><div><h2 className="font-display text-[24px] text-ink" id="edit-account-title">Edit account</h2><p className="mt-1 text-sm text-muted">Update the name, type, currency, or current balance.</p></div><button aria-label="Close dialog" className="icon-button size-8" disabled={submitting} onClick={closeDialogs} type="button"><X size={16} /></button></div>
            <form className="space-y-4" onSubmit={(event) => { void saveAccount(event); }}>
              <label className="block text-sm font-medium text-ink" htmlFor="edit-account-name">Account name<input autoFocus className="mt-1.5 h-11 w-full rounded-md border border-line bg-canvas px-3 text-sm text-ink" defaultValue={editingAccount.name} id="edit-account-name" maxLength={80} name="name" required /></label>
              <label className="block text-sm font-medium text-ink" htmlFor="edit-account-type">Account type<select className="mt-1.5 h-11 w-full rounded-md border border-line bg-canvas px-3 text-sm text-ink" defaultValue={editingAccount.type} id="edit-account-type" name="type"><option value="bank">Bank</option><option value="ewallet">E-wallet</option><option value="investment">Investment</option><option value="credit_card">Credit card</option></select></label>
              <label className="block text-sm font-medium text-ink" htmlFor="edit-account-currency">Currency<input autoCapitalize="characters" className="mt-1.5 h-11 w-full rounded-md border border-line bg-canvas px-3 text-sm uppercase text-ink" defaultValue={editingAccount.currency || "USD"} id="edit-account-currency" list="edit-account-currency-options" maxLength={3} name="currency" pattern="[A-Za-z]{3}" required /><datalist id="edit-account-currency-options">{currencyOptions.map(([code, name]) => <option key={code} label={`${code} - ${name}`} value={code} />)}</datalist><span className="mt-1 block text-xs font-normal text-muted">Use a three-letter ISO currency code.</span></label>
              <label className="block text-sm font-medium text-ink" htmlFor="edit-account-balance">Current balance<AmountInput className="mt-1.5 h-11 w-full rounded-md border border-line bg-canvas px-3 text-sm text-ink" id="edit-account-balance" name="balance" onChange={setEditingBalance} required value={editingBalance} /></label>
              {actionError && <p className="rounded-md bg-secondary-soft px-3 py-2.5 text-sm text-ink" role="alert">{actionError}</p>}
              <button className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-accent px-4 text-sm font-semibold text-white disabled:opacity-60" disabled={submitting} type="submit">{submitting ? "Saving..." : "Save changes"}</button>
            </form>
          </section>
        </div>
      )}
      {deletingAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !submitting) closeDialogs(); }}>
          <section aria-describedby="delete-account-warning" aria-labelledby="delete-account-title" aria-modal="true" className="w-full max-w-[440px] rounded-xl border border-line bg-surface p-5 shadow-xl sm:p-6" role="alertdialog">
            <h2 className="font-display text-[24px] text-ink" id="delete-account-title">Delete {deletingAccount.name}?</h2>
            <p className="mt-2 text-sm leading-6 text-muted" id="delete-account-warning">This permanently deletes this account and every transaction linked to it. This can’t be undone.</p>
            {actionError && <p className="mt-4 rounded-md bg-secondary-soft px-3 py-2.5 text-sm text-ink" role="alert">{actionError}</p>}
            <div className="mt-6 flex justify-end gap-2"><button autoFocus className="h-10 rounded-lg border border-line px-4 text-sm font-semibold text-ink hover:bg-raised" disabled={submitting} onClick={closeDialogs} type="button">Cancel</button><button className="h-10 rounded-lg bg-secondary px-4 text-sm font-semibold text-white hover:brightness-95 disabled:opacity-60" disabled={submitting} onClick={() => { void deleteAccount(); }} type="button">{submitting ? "Deleting..." : "Delete account"}</button></div>
          </section>
        </div>
      )}
    </>
  );
}

function TransactionList({ transactions, accounts, loading }: { transactions: Transaction[]; accounts: Account[]; loading: boolean }) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const accountNames = new Map(accounts.map((account) => [account.id, account.name]));
  const filtered = transactions.filter((transaction) => {
    if (typeFilter !== "all" && transaction.transaction_type !== typeFilter) return false;
    const searchable = `${transaction.category ?? ""} ${transaction.notes ?? ""} ${transaction.account_id ? accountNames.get(transaction.account_id) ?? "" : ""}`;
    return searchable.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <section className="overflow-hidden rounded-xl border border-line bg-surface">
      <div className="flex flex-col gap-3 border-b border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div><h2 className="font-display text-[21px] text-ink">Transaction history</h2><p className="mt-1 text-xs text-muted">Most recent transactions first</p></div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="relative block sm:w-56"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} /><input aria-label="Search transactions" className="h-10 w-full rounded-md border border-line bg-canvas pl-9 pr-3 text-sm text-ink outline-none focus:border-accent" onChange={(event) => setSearch(event.target.value)} placeholder="Search transactions" value={search} /></label>
          <select aria-label="Filter transaction type" className="h-10 rounded-md border border-line bg-canvas px-3 text-sm text-ink" onChange={(event) => setTypeFilter(event.target.value)} value={typeFilter}><option value="all">All types</option><option value="income">Income</option><option value="expense">Expenses</option></select>
        </div>
      </div>
      {loading ? <EmptyState title="Loading transactions" detail="Fetching your transaction history from Supabase." /> : filtered.length === 0 ? <EmptyState title={transactions.length ? "No matching transactions" : "No transactions yet"} detail={transactions.length ? "Try changing the search or type filter." : "Transactions you add will appear here."} /> : (
        <ul className="divide-y divide-line">{filtered.map((transaction) => {
          const income = transaction.transaction_type === "income";
          const title = transaction.category || transaction.notes || (income ? "Income" : "Expense");
          return <li className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-5 py-4 sm:gap-4 sm:px-6" key={transaction.id}><span className={`flex size-10 items-center justify-center rounded-full ${income ? "bg-accent-soft text-accent" : "bg-secondary-soft text-secondary"}`}>{income ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}</span><div className="min-w-0"><p className="truncate text-sm font-semibold text-ink">{title}</p><p className="mt-1 truncate text-xs text-muted">{new Date(transaction.created_at).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" })}{transaction.account_id ? ` · ${accountNames.get(transaction.account_id) ?? "Account"}` : " · Unassigned"}</p></div><p className={`text-right text-sm font-semibold ${income ? "text-accent" : "text-ink"}`}>{income ? "+" : "−"}{formatCurrency(Math.abs(Number(transaction.amount)), transaction.currency || "USD")}</p></li>;
        })}</ul>
      )}
      {!loading && transactions.length > 0 && <p className="border-t border-line px-5 py-3 text-xs text-muted sm:px-6">Showing {filtered.length} of {transactions.length} loaded transactions</p>}
    </section>
  );
}

export function FinanceDataPage({ kind }: { kind: PageKind }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(!supabase);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null);
  const [errorState, setErrorState] = useState<{ userId: string; message: string } | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => { if (active) { setSession(nextSession); setReady(true); } });
    void supabase.auth.getSession().then(({ data }) => { if (active) { setSession(data.session); setReady(true); } });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!supabase || !session?.user.id) return;
    const client = supabase;
    const userId = session.user.id;
    let active = true;
    void Promise.all([
      client.from("accounts").select("id, name, type, balance, currency").eq("user_id", userId),
      client.from("transactions").select("id, amount, account_id, category, notes, transaction_type, currency, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(1000),
    ]).then(([accountResult, transactionResult]) => {
      if (!active) return;
      const queryError = accountResult.error ?? transactionResult.error;
      if (queryError) setErrorState({ userId, message: queryError.message });
      else { setAccounts((accountResult.data ?? []) as Account[]); setTransactions((transactionResult.data ?? []) as Transaction[]); }
      setLoadedUserId(userId);
    }).catch((queryError: unknown) => {
      if (!active) return;
      setErrorState({ userId, message: queryError instanceof Error ? queryError.message : "Could not load your finance data." });
      setLoadedUserId(userId);
    });
    return () => { active = false; };
  }, [session?.user.id, refreshToken]);

  const title = kind === "accounts" ? "Accounts" : "Transactions";
  const description = kind === "accounts" ? "Your connected balances, organized by account." : "Search and filter your latest 1,000 money movements.";
  const loading = Boolean(session && loadedUserId !== session.user.id);
  const error = session && errorState?.userId === session.user.id ? errorState.message : null;

  return (
    <div className="min-h-screen bg-canvas transition-colors duration-300">
      <Header kind={kind} session={session} />
      <main className="mx-auto max-w-[1320px] px-5 pb-12 pt-8 sm:px-8 sm:pt-11 lg:px-12 lg:pt-14">
        {configurationError ? <section className="mx-auto max-w-[620px] rounded-xl border border-line bg-surface p-6 sm:p-8"><h1 className="font-display text-[28px] text-ink">Connect your Supabase project</h1><p className="mt-2 text-sm leading-6 text-muted">{configurationError}</p></section> : !supabase || !ready ? <p className="py-12 text-center text-sm text-muted">Checking your secure session...</p> : !session ? (
          <section className="mx-auto max-w-[440px] rounded-xl border border-line bg-surface p-6 text-center sm:p-8"><h1 className="font-display text-[28px] text-ink">Sign in to view {title.toLowerCase()}</h1><p className="mt-2 text-sm text-muted">Your financial data is only available after signing in.</p><Link className="mt-5 inline-flex h-10 items-center rounded-lg bg-accent px-4 text-sm font-semibold text-white" href="/">Go to sign in</Link></section>
        ) : (
          <>
            <div className="mb-7 flex flex-col gap-4 sm:mb-9 sm:flex-row sm:items-end sm:justify-between"><div><p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-accent">Moneyfi workspace</p><h1 className="font-display text-[34px] leading-tight text-ink sm:text-[40px]">{title}</h1><p className="mt-2 text-sm text-muted">{description}</p></div><Link className="inline-flex h-10 items-center self-start rounded-lg border border-line bg-surface px-4 text-sm font-semibold text-ink hover:bg-raised sm:self-auto" href="/">Back to overview</Link></div>
            {error ? <div className="rounded-xl border border-line bg-surface px-5 py-8 text-center"><p className="text-sm font-medium text-ink">Could not load {title.toLowerCase()}</p><p className="mt-1 text-xs text-muted">{error}</p></div> : kind === "accounts" ? <AccountList accounts={accounts} client={supabase} loading={loading} onChanged={() => setRefreshToken((value) => value + 1)} userId={session.user.id} /> : <TransactionList accounts={accounts} loading={loading} transactions={transactions} />}
          </>
        )}
      </main>
    </div>
  );
}