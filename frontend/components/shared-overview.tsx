"use client";

import { CreditCard, Leaf, TrendingUp, Wallet } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/currency";
import { hashShareToken } from "@/lib/share-token";
import { getSupabaseBrowserClient, getSupabaseConfigurationError } from "@/lib/supabase/client";

type SharedTotal = { currency: string; value: number | string };
type SharedAccount = { name: string; type: string; balance: number | string; currency: string };
type SharedOverviewData = {
  cash: SharedTotal[];
  investments: SharedTotal[];
  credit_debt: SharedTotal[];
  accounts: SharedAccount[] | null;
  accounts_require_sign_in: boolean;
};

const supabase = getSupabaseBrowserClient();
const configurationError = getSupabaseConfigurationError();
const validTokenPattern = /^[0-9a-f]{64}$/;
const accountLabels: Record<string, string> = { bank: "Bank", ewallet: "E-wallet", investment: "Investment", credit_card: "Credit card" };

export function SharedOverview({ token }: { token: string }) {
  const validToken = validTokenPattern.test(token);
  const [overview, setOverview] = useState<SharedOverviewData | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const [loading, setLoading] = useState(Boolean(supabase && validToken));
  const [error, setError] = useState<string | null>(configurationError ?? (validToken ? null : "This share link is invalid or no longer available."));

  useEffect(() => {
    let active = true;
    if (!supabase || !validToken) return () => { active = false; };

    void (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const tokenHash = await hashShareToken(token);
        const { data, error: queryError } = await supabase.rpc("get_shared_overview", { p_token_hash: tokenHash });
        if (!active) return;
        setSignedIn(Boolean(session));
        if (queryError) setError("This shared overview could not be loaded.");
        else if (!data) setError("This share link is invalid, expired, or has been revoked.");
        else setOverview(data as SharedOverviewData);
      } catch {
        if (active) setError("This shared overview could not be loaded.");
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => { active = false; };
  }, [token, validToken]);

  const metrics = overview ? [
    { label: "Cash & savings", totals: overview.cash, icon: Wallet, tone: "green" },
    { label: "Investments", totals: overview.investments, icon: TrendingUp, tone: "pink" },
    { label: "Credit debt", totals: overview.credit_debt, icon: CreditCard, tone: "blue" },
  ] : [];

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <header className="border-b border-line bg-surface/85">
        <div className="mx-auto flex h-[72px] max-w-[1100px] items-center justify-between px-5 sm:px-8">
          <Link aria-label="Moneyfi home" className="flex items-center gap-2.5" href="/">
            <span className="flex size-9 items-center justify-center rounded-xl bg-accent text-white"><Leaf size={19} /></span>
            <span className="font-display text-[23px] leading-none text-ink">moneyfi</span>
          </Link>
          <span className="text-xs font-medium text-muted">Shared overview</span>
        </div>
      </header>

      <main className="mx-auto max-w-[1100px] px-5 pb-12 pt-10 sm:px-8 sm:pt-14">
        <div className="mb-7">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-accent">Shared view</p>
          <h1 className="font-display text-[32px] leading-tight text-ink sm:text-[38px]">Financial overview</h1>
          <p className="mt-2 text-sm text-muted">Shared with you by a Moneyfi user.</p>
        </div>

        {loading ? <p className="py-12 text-center text-sm text-muted">Loading shared overview...</p> : error ? (
          <section className="rounded-xl border border-line bg-surface px-5 py-8 text-center sm:px-8">
            <p className="text-sm font-medium text-ink">{error}</p>
            {configurationError && <p className="mt-2 text-xs text-muted">{configurationError}</p>}
            <Link className="mt-5 inline-flex h-10 items-center rounded-lg border border-line px-4 text-sm font-semibold text-ink hover:bg-raised" href="/">Go to Moneyfi</Link>
          </section>
        ) : overview && (
          <>
            <section aria-label="Shared financial totals" className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {metrics.map(({ label, totals, icon: Icon, tone }) => (
                <article className="rounded-xl border border-line bg-surface p-5 shadow-[0_2px_12px_rgba(45,55,45,0.025)] sm:p-6" key={label}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-sm font-medium text-muted">{label}</h2>
                      <div className="mt-3 space-y-1">
                        {(totals.length ? totals : [{ currency: "PHP", value: 0 }]).map((total) => <p className="font-display text-[25px] leading-tight text-ink" key={total.currency}>{formatCurrency(Number(total.value), total.currency)}</p>)}
                      </div>
                    </div>
                    <span className={`metric-icon metric-icon-${tone}`}><Icon size={19} strokeWidth={1.8} /></span>
                  </div>
                </article>
              ))}
            </section>

            {overview.accounts && (
              <section aria-labelledby="shared-accounts-title" className="mt-8 overflow-hidden rounded-xl border border-line bg-surface">
                <div className="border-b border-line px-5 py-4 sm:px-6">
                  <h2 className="font-display text-[21px] text-ink" id="shared-accounts-title">Shared accounts</h2>
                  <p className="mt-1 text-xs text-muted">Balances shown in each account’s own currency</p>
                </div>
                {overview.accounts.length === 0 ? <p className="px-5 py-8 text-center text-sm text-muted">No accounts to show.</p> : (
                  <ul className="divide-y divide-line">
                    {overview.accounts.map((account) => (
                      <li className="flex items-center justify-between gap-4 px-5 py-4 sm:px-6" key={`${account.name}-${account.type}-${account.currency}`}>
                        <div className="min-w-0"><p className="truncate text-sm font-semibold text-ink">{account.name}</p><p className="mt-1 text-xs text-muted">{accountLabels[account.type] ?? account.type} · {account.currency}</p></div>
                        <p className="shrink-0 text-right text-sm font-semibold text-ink">{formatCurrency(Number(account.balance), account.currency)}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}

            {overview.accounts_require_sign_in && !signedIn && (
              <section className="mt-8 flex flex-col gap-3 rounded-xl border border-line bg-surface p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div><h2 className="text-sm font-semibold text-ink">Accounts are available to signed-in viewers</h2><p className="mt-1 text-xs leading-5 text-muted">Sign in to Moneyfi, then reopen this share link to view account details.</p></div>
                <Link className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg bg-accent px-4 text-sm font-semibold text-white hover:brightness-95" href="/">Sign in</Link>
              </section>
            )}

            <p className="mt-8 text-center text-xs text-muted">This is a read-only view. The owner can revoke its link at any time.</p>
          </>
        )}
      </main>
    </div>
  );
}