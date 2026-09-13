import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.afranio.treinoapp",
  appName: "Treino & Dieta",
  // Fully static build (next.config.ts: output "export") bundled locally —
  // the app launches instantly and its shell works offline. Only the actual
  // Supabase calls (auth, reading/saving data) need a network connection.
  webDir: "out",
  ios: {
    // "never" lets the WebView draw full-bleed under the status bar/notch, so
    // our own background (cream/navy, set in CSS) shows there instead of the
    // native root view's white — the page pads itself with
    // env(safe-area-inset-top) instead. StatusBar.setOverlaysWebView keeps the
    // status bar itself transparent so this actually shows through.
    contentInset: "never",
  },
  plugins: {
    StatusBar: {
      overlaysWebView: true,
    },
  },
};

export default config;
