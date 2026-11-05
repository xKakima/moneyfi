"use client";

import { Settings, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const supabase = getSupabaseBrowserClient();

export function GamificationSettings({
  userId,
  onEnabledChange,
  onSettingsLoaded,
}: {
  userId: string;
  onEnabledChange?: (enabled: boolean) => void;
  onSettingsLoaded?: () => void;
}) {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!supabase) return () => { active = false; };

    void (async () => {
      try {
        const { data, error: queryError } = await supabase.from("user_preferences")
          .select("gamification_enabled")
          .eq("user_id", userId)
          .maybeSingle();
        if (!active) return;
        if (queryError) {
          setError(queryError.message);
          return;
        }
        const nextEnabled = data?.gamification_enabled ?? false;
        setEnabled(nextEnabled);
        onEnabledChange?.(nextEnabled);
      } catch (queryError) {
        if (active) setError(queryError instanceof Error ? queryError.message : "Could not load gamification settings.");
      } finally {
        if (active) {
          setLoading(false);
          onSettingsLoaded?.();
        }
      }
    })();

    return () => { active = false; };
  }, [onEnabledChange, onSettingsLoaded, userId]);

  async function saveEnabled(nextEnabled: boolean) {
    if (!supabase) {
      setError("Gamification settings are unavailable because Supabase is not configured.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const { error: saveError } = await supabase.from("user_preferences").upsert({
        user_id: userId,
        gamification_enabled: nextEnabled,
      }, { onConflict: "user_id" });
      if (saveError) {
        setError(saveError.message);
        return;
      }
      setEnabled(nextEnabled);
      onEnabledChange?.(nextEnabled);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save gamification settings.");
    } finally {
      setSaving(false);
    }
  }

  const settingsError = error ?? (!supabase ? "Gamification settings are unavailable because Supabase is not configured." : null);

  return (
    <details className="relative">
      <summary aria-label="Settings" className="icon-button list-none cursor-pointer [&::-webkit-details-marker]:hidden">
        <Settings size={17} />
      </summary>
      <section aria-label="Settings" className="absolute right-0 top-full z-50 mt-2 w-[min(20rem,calc(100vw-2.5rem))] rounded-xl border border-line bg-surface p-4 text-left shadow-lg">
        <h2 className="text-sm font-semibold text-ink">Settings</h2>
        <label className="mt-4 flex cursor-pointer items-start gap-3">
          <input
            checked={enabled}
            className="mt-0.5 size-4 shrink-0 accent-[var(--accent)]"
            disabled={!supabase || loading || saving || Boolean(error)}
            onChange={(event) => { void saveEnabled(event.target.checked); }}
            type="checkbox"
          />
          <span>
            <span className="flex items-center gap-1.5 text-sm font-medium text-ink"><Sparkles size={15} className="text-accent" /> Character & companion quests</span>
            <span className="mt-1 block text-xs leading-5 text-muted">Opt in to private mini quests that level up your character and pet. No streaks or penalties; your progress stays if you turn this off.</span>
          </span>
        </label>
        {loading && supabase && <p className="mt-3 text-xs text-muted">Loading settings...</p>}
        {saving && <p className="mt-3 text-xs text-muted">Saving setting...</p>}
        {settingsError && <p className="mt-3 text-xs text-secondary" role="alert">Could not load or save this setting: {settingsError}</p>}
      </section>
    </details>
  );
}
