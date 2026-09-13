import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.afranio.treinoapp",
  appName: "Treino & Dieta",
  // Fully static build (next.config.ts: output "export") bundled locally —
  // the app launches instantly and its shell works offline. Only the actual
  // Supabase calls (auth, reading/saving data) need a network connection.
  webDir: "out",
  // Belt-and-suspenders for the status bar strip fix — this config key is
  // Android-only in practice, the real iOS fix is the root view's
  // backgroundColor set directly in SceneDelegate.swift. Navy matches the
  // bottom tab bar.
  backgroundColor: "#0D1B2A",
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
