"use client";

import { ArrowDownLeft, ArrowUpRight, Banknote, CreditCard, Leaf, LogOut, Menu, Moon, Search, Sun, TrendingUp, Wallet, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { useTheme } from "@/components/theme-provider";
import { formatCurrency } from "@/lib/currency";
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
          <button aria-expanded={mobileMenuOpen} aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"} className="icon-button md:hidden" onClick={() => setMobileMenuOpen((open) => !open)} type="button">{mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}</button>
          <ThemeButton />
          {session && supabase && <button aria-label="Sign out" className="icon-button" onClick={() => { void supabase.auth.signOut(); }} title="Sign out" type="button"><LogOut size={17} /></button>}
        </div>
        {mobileMenuOpen && <nav aria-label="Mobile navigation" className="absolute left-0 right-0 top-[72px] z-40 border-b border-line bg-surface px-5 py-3 shadow-md md:hidden"><Link className="block rounded-md px-3 py-2.5 text-sm font-medium text-ink hover:bg-raised" href="/" onClick={() => setMobileMenuOpen(false)}>Overview</Link><Link className="block rounded-md px-3 py-2.5 text-sm font-medium text-ink hover:bg-raised" href="/transactions" onClick={() => setMobileMenuOpen(false)}>Transactions</Link><Link className="block rounded-md px-3 py-2.5 text-sm font-medium text-ink hover:bg-raised" href="/accounts" onClick={() => setMobileMenuOpen(false)}>Accounts</Link></nav>}
      </div>
    </header>
  );
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return <div className="flex min-h-56 flex-col items-center justify-center px-6 py-10 text-center"><span className="mb-3 flex size-11 items-center justify-center rounded-full bg-accent-soft text-accent"><Banknote size={20} /></span><p className="text-sm font-medium text-ink">{title}</p><p className="mt-1 max-w-sm text-xs leading-5 text-muted">{detail}</p></div>;
}

function AccountList({ accounts, loading }: { accounts: Account[]; loading: boolean }) {
  const [search, setSearch] = useState("");
  const filtered = accounts.filter((account) => `${account.name} ${account.type} ${account.currency}`.toLowerCase().includes(search.toLowerCase()));
  const grouped = new Map<string, number>();
  for (const account of accounts) {
    const currency = account.currency || "USD";
    grouped.set(currency, (grouped.get(currency) ?? 0) + Number(account.balance || 0));
  }

  return (
    <>
      <div className="mb-6 grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2">
        <div className="bg-surface p-5 sm:p-6"><p className="text-sm text-muted">Accounts</p><p className="mt-2 font-display text-3xl text-ink">{loading ? "..." : accounts.length}</p></div>
        <div className="bg-surface p-5 sm:p-6"><p className="text-sm text-muted">Balances by currency</p><div className="mt-2 flex flex-wrap gap-x-5 gap-y-1">
          {loading ? <span className="text-sm text-muted">Loading...</span> : Array.from(grouped, ([currency, total]) => <span className="font-display text-xl text-ink" key={currency}>{formatCurrency(total, currency)}</span>)}
          {!loading && accounts.length === 0 && <span className="text-sm text-muted">No accounts yet</span>}
        </div></div>
      </div>
      <section className="overflow-hidden rounded-xl border border-line bg-surface">
        <div className="flex flex-col gap-3 border-b border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div><h2 className="font-display text-[21px] text-ink">All accounts</h2><p className="mt-1 text-xs text-muted">Balances shown in each account’s own currency</p></div>
          <label className="relative block sm:w-64"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} /><input aria-label="Search accounts" className="h-10 w-full rounded-md border border-line bg-canvas pl-9 pr-3 text-sm text-ink outline-none focus:border-accent" onChange={(event) => setSearch(event.target.value)} placeholder="Search accounts" value={search} /></label>
        </div>
        {loading ? <EmptyState title="Loading accounts" detail="Fetching your accounts from Supabase." /> : filtered.length === 0 ? <EmptyState title={accounts.length ? "No matching accounts" : "No accounts yet"} detail={accounts.length ? "Try another search." : "Add an account from your overview to see it listed here."} /> : (
          <ul className="divide-y divide-line">{filtered.map((account) => {
            const Icon = account.type === "investment" ? TrendingUp : account.type === "credit_card" ? CreditCard : Wallet;
            return <li className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-5 py-4 sm:gap-4 sm:px-6" key={account.id}><span className="flex size-10 items-center justify-center rounded-lg bg-accent-soft text-accent"><Icon size={19} /></span><div className="min-w-0"><p className="truncate text-sm font-semibold text-ink">{account.name}</p><p className="mt-1 text-xs text-muted">{accountLabels[account.type] ?? account.type} · {account.currency || "USD"}</p></div><p className="text-right text-sm font-semibold text-ink">{formatCurrency(Number(account.balance || 0), account.currency || "USD")}</p></li>;
          })}</ul>
        )}
      </section>
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
  }, [session?.user.id]);

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
            {error ? <div className="rounded-xl border border-line bg-surface px-5 py-8 text-center"><p className="text-sm font-medium text-ink">Could not load {title.toLowerCase()}</p><p className="mt-1 text-xs text-muted">{error}</p></div> : kind === "accounts" ? <AccountList accounts={accounts} loading={loading} /> : <TransactionList accounts={accounts} loading={loading} transactions={transactions} />}
          </>
        )}
      </main>
    </div>
  );
}