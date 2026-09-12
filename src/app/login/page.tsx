"use client";

import { useEffect } from "react";
import { styles } from "@/lib/styles";

/** /login was folded into the root AuthGate — this just bounces old links/bookmarks there. */
export default function LoginRedirect() {
  useEffect(() => {
    window.location.replace("/");
  }, []);
  return <div style={styles.loadingWrap}>Carregando…</div>;
}
