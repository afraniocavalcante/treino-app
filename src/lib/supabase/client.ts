import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Plain supabase-js client (localStorage-backed session), not the @supabase/ssr
 * cookie-backed one — this app has no server anymore (static export + client-side
 * auth), and cookie-based session sharing across separate client instances proved
 * unreliable inside the Capacitor WebView (queries silently ran unauthenticated,
 * returning empty results past RLS instead of an error).
 */
export function createClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
