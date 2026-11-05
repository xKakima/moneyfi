import { getAuthenticatedSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await getAuthenticatedSupabaseClient(request);
  if (!auth.client) return auth.response;

  try {
    const { data, error } = await auth.client.rpc("get_rpg_state");
    if (error) {
      if (error.code === "P0001" && error.message.includes("Enable Character & companion quests")) {
        return Response.json({ error: error.message }, { status: 403 });
      }
      console.error("Could not load RPG state from Supabase.", error);
      return Response.json({ error: "Could not load your RPG progress." }, { status: 502 });
    }
    return Response.json({ data }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("RPG state request failed.", error);
    return Response.json({ error: "Could not load your RPG progress." }, { status: 502 });
  }
}
