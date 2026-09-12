import { createClient } from "./supabase/client";

export async function signOut(): Promise<void> {
  const supabase = createClient();
  await supabase.auth.signOut();
  // AuthGate's onAuthStateChange listener picks up the session change and swaps to the login screen.
}
