import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type AuthenticatedSupabaseResult =
  | { client: SupabaseClient; response?: never }
  | { client?: never; response: Response };

export async function getAuthenticatedSupabaseClient(request: Request): Promise<AuthenticatedSupabaseResult> {
  const authorization = request.headers.get("authorization");
  const tokenMatch = authorization?.match(/^Bearer\s+(\S+)$/i);
  if (!tokenMatch) {
    return { response: Response.json({ error: "Authentication required." }, { status: 401 }) };
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    console.error("RPG API is missing its Supabase URL or anon key.");
    return { response: Response.json({ error: "The RPG service is not configured." }, { status: 503 }) };
  }

  const client = createClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
    global: {
      headers: { Authorization: `Bearer ${tokenMatch[1]}` },
    },
  });

  try {
    const { data, error } = await client.auth.getUser(tokenMatch[1]);
    if (error || !data.user) {
      return { response: Response.json({ error: "Your session is invalid or expired. Please sign in again." }, { status: 401 }) };
    }
  } catch (error) {
    console.error("Could not verify the RPG API session.", error);
    return { response: Response.json({ error: "Could not verify your session." }, { status: 503 }) };
  }

  return { client };
}
