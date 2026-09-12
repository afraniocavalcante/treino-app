"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { styles } from "@/lib/styles";
import { notifyAppReady } from "@/lib/updater";
import LoginForm from "./login/LoginForm";
import Hub from "./Hub";

/**
 * Client-side auth gate — replaces the old middleware/server-action flow so the
 * app works fully offline-bundled in Capacitor (static export has no server to
 * run middleware or server actions on).
 */
export default function AuthGate() {
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    notifyAppReady();
    const supabase = createClient();
    let cancelled = false;

    supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return;
      setAuthed(!!data.user);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthed(!!session?.user);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (loading) return <div style={styles.loadingWrap}>Carregando…</div>;
  return authed ? <Hub /> : <LoginForm />;
}
