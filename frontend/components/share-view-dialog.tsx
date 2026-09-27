"use client";

import { Check, Copy, Link2, Share2, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { generateShareToken, hashShareToken } from "@/lib/share-token";

type ShareRow = {
  id: string;
  allow_accounts: boolean;
  created_at: string;
  revoked_at: string | null;
};

export function ShareViewDialog({ client, userId, onClose }: {
  client: SupabaseClient;
  userId: string;
  onClose: () => void;
}) {
  const [shares, setShares] = useState<ShareRow[]>([]);
  const [allowAccounts, setAllowAccounts] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [newShareId, setNewShareId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !saving) onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, saving]);

  useEffect(() => {
    let active = true;
    void client.from("dashboard_shares")
      .select("id, allow_accounts, created_at, revoked_at")
      .eq("user_id", userId)
      .is("revoked_at", null)
      .order("created_at", { ascending: false })
      .then(({ data, error: queryError }) => {
        if (!active) return;
        if (queryError) setError(queryError.message);
        else setShares((data ?? []) as ShareRow[]);
        setLoading(false);
      });
    return () => { active = false; };
  }, [client, userId]);

  async function createShare() {
    setSaving(true);
    setError(null);
    setStatus(null);
    try {
      const token = generateShareToken();
      const tokenHash = await hashShareToken(token);
      const { data, error: insertError } = await client.from("dashboard_shares")
        .insert({ user_id: userId, token_hash: tokenHash, allow_accounts: allowAccounts })
        .select("id, allow_accounts, created_at, revoked_at")
        .single();
      if (insertError) {
        setError(insertError.message);
        return;
      }
      setShares((current) => [data as ShareRow, ...current]);
      setNewShareId((data as ShareRow).id);
      setShareUrl(`${window.location.origin}/share/${token}`);
      setStatus("Share link created.");
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Unable to create a share link.");
    } finally {
      setSaving(false);
    }
  }

  async function copyShareUrl() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setStatus("Share link copied.");
    } catch {
      setError("Could not copy the link. Select and copy it from the field.");
    }
  }

  async function revokeShare(share: ShareRow) {
    setSaving(true);
    setError(null);
    const { error: revokeError } = await client.from("dashboard_shares")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", share.id)
      .eq("user_id", userId);
    if (revokeError) setError(revokeError.message);
    else {
      setShares((current) => current.filter((item) => item.id !== share.id));
      setStatus("Share link revoked.");
      if (newShareId === share.id) {
        setShareUrl(null);
        setNewShareId(null);
      }
    }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) onClose(); }}>
      <section aria-labelledby="share-dialog-title" aria-modal="true" className="max-h-[calc(100dvh-2rem)] w-full max-w-[520px] overflow-y-auto rounded-xl border border-line bg-surface p-5 shadow-xl sm:p-6" role="dialog">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <span className="mb-2 flex size-9 items-center justify-center rounded-lg bg-accent-soft text-accent"><Share2 size={18} /></span>
            <h2 className="font-display text-[24px] text-ink" id="share-dialog-title">Share overview</h2>
            <p className="mt-1 text-sm leading-5 text-muted">Anyone with the link can view your overview totals.</p>
          </div>
          <button aria-label="Close dialog" className="icon-button size-8" disabled={saving} onClick={onClose} type="button"><X size={16} /></button>
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-line bg-canvas p-3.5">
          <input checked={allowAccounts} className="mt-0.5 size-4 accent-[var(--accent)]" onChange={(event) => setAllowAccounts(event.target.checked)} type="checkbox" />
          <span>
            <span className="block text-sm font-semibold text-ink">Allow signed-in viewers to see accounts</span>
            <span className="mt-1 block text-xs leading-5 text-muted">Account names and balances stay hidden from signed-out visitors.</span>
          </span>
        </label>

        <button className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 text-sm font-semibold text-white transition hover:brightness-95 disabled:cursor-wait disabled:opacity-60" disabled={saving} onClick={() => { void createShare(); }} type="button">
          <Link2 size={16} />{saving ? "Working..." : "Create share link"}
        </button>

        {shareUrl && (
          <div className="mt-4 rounded-lg border border-accent/25 bg-accent-soft p-3.5" role="status">
            <p className="mb-2 text-xs font-semibold text-ink">Your new link</p>
            <div className="flex gap-2">
              <input aria-label="New share link" className="h-10 min-w-0 flex-1 rounded-md border border-line bg-surface px-3 text-xs text-ink" onFocus={(event) => event.currentTarget.select()} readOnly value={shareUrl} />
              <button aria-label="Copy share link" className="icon-button size-10 shrink-0" onClick={() => { void copyShareUrl(); }} title="Copy share link" type="button"><Copy size={16} /></button>
            </div>
          </div>
        )}

        {error && <p className="mt-3 rounded-md bg-secondary-soft px-3 py-2.5 text-sm text-ink" role="alert">{error}</p>}
        {status && <p className="mt-3 flex items-center gap-2 text-xs text-accent" role="status"><Check size={15} />{status}</p>}

        <div className="mt-6 border-t border-line pt-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-ink">Active links</h3>
            <span className="text-xs text-muted">{shares.length}</span>
          </div>
          {loading ? <p className="py-3 text-sm text-muted">Loading links...</p> : shares.length === 0 ? <p className="py-3 text-sm text-muted">No active share links.</p> : (
            <ul className="divide-y divide-line">
              {shares.map((share) => (
                <li className="flex items-center justify-between gap-3 py-3" key={share.id}>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink">{share.allow_accounts ? "Totals + accounts for signed-in viewers" : "Overview totals only"}</p>
                    <p className="mt-1 text-xs text-muted">Created {new Date(share.created_at).toLocaleDateString()}</p>
                  </div>
                  <button aria-label="Revoke share link" className="icon-button size-9 shrink-0 text-secondary" disabled={saving} onClick={() => { void revokeShare(share); }} title="Revoke share link" type="button"><Trash2 size={16} /></button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}