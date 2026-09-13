import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.afranio.treinoapp",
  appName: "Treino & Dieta",
  // Fully static build (next.config.ts: output "export") bundled locally —
  // the app launches instantly and its shell works offline. Only the actual
  // Supabase calls (auth, reading/saving data) need a network connection.
  webDir: "out",
  // Colors the tiny native strip behind the status bar (outside the WebView
  // itself, so CSS alone can't reach it) — without this it's plain white
  // regardless of what the page underneath looks like. Matches the app's
  // cream canvas; the login screen's navy is the one exception that won't
  // get this treatment (native config can't vary this by screen).
  backgroundColor: "#F5EFE3",
  ios: {
    // "always": Capacitor insets the WebView below the status bar itself
    // (the standard, reliable behavior) rather than drawing full-bleed under
    // it — full-bleed depends on the WebView correctly reporting
    // safe-area-inset-* via CSS env(), which didn't come through reliably.
    contentInset: "always",
  },
  plugins: {
    StatusBar: {
      overlaysWebView: false,
    },
  },
};

export default config;
