import { getSupabaseBrowserClient } from "@/lib/supabase/client";

async function requestRpgApi(path: string, init?: RequestInit): Promise<unknown> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error("RPG quests are unavailable because Supabase is not configured.");

  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(error.message);
  const accessToken = data.session?.access_token;
  if (!accessToken) throw new Error("Please sign in to access RPG quests.");

  const response = await fetch(path, {
    ...init,
    headers: {
      ...init?.headers,
      Authorization: `Bearer ${accessToken}`,
    },
  });
  let payload: { data?: unknown; error?: string };
  try {
    payload = await response.json() as { data?: unknown; error?: string };
  } catch {
    throw new Error("The RPG service returned an unreadable response.");
  }
  if (!response.ok) throw new Error(payload.error ?? "The RPG request failed.");
  return payload.data;
}

export function getRpgState() {
  return requestRpgApi("/api/rpg/state", { method: "GET", cache: "no-store" });
}

export async function completeRpgQuest(questKey: string): Promise<void> {
  await requestRpgApi("/api/rpg/complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ questKey }),
  });
}
