import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Plain supabase-js client (localStorage-backed session), not the @supabase/ssr
 * cookie-backed one — this app has no server anymore (static export + client-side
 * auth), and cookie-based session sharing across separate client instances proved
 * unreliable inside the Capacitor WebView (queries silently ran unauthenticated,
 * returning empty results past RLS instead of an error).
 *
 * Module-level singleton: every screen (Hub, WorkoutApp, DietApp, Settings,
 * TreinoSettings, ...) calls createClient() straight in its component body,
 * so without this they'd each spin up their own GoTrueClient on every render
 * — Supabase's own "Multiple GoTrueClient instances" warning, and real
 * overhead (each instance independently polling/refreshing auth state
 * against the same localStorage key). One instance, reused everywhere.
 */
let client: SupabaseClient | null = null;

export function createClient(): SupabaseClient {
  if (!client) {
    client = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return client;
}
