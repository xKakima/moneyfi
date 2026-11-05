import { getAuthenticatedSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const questKeys = new Set([
  "first_goal",
  "budget_review",
  "bill_review",
  "transaction_review",
]);

export async function POST(request: Request) {
  const auth = await getAuthenticatedSupabaseClient(request);
  if (!auth.client) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const questKey = typeof body === "object" && body !== null && "questKey" in body
    ? body.questKey
    : null;
  if (typeof questKey !== "string" || !questKeys.has(questKey)) {
    return Response.json({ error: "Choose a valid quest." }, { status: 400 });
  }

  try {
    const { data, error } = await auth.client.rpc("complete_rpg_quest", { p_quest_key: questKey });
    if (error) {
      if (error.code === "P0001") {
        return Response.json({ error: error.message }, { status: 409 });
      }
      console.error("Could not complete RPG quest in Supabase.", error);
      return Response.json({ error: "Could not complete this quest." }, { status: 502 });
    }
    return Response.json({ data }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("RPG quest completion request failed.", error);
    return Response.json({ error: "Could not complete this quest." }, { status: 502 });
  }
}
