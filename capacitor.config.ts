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
  // backgroundColor set directly in SceneDelegate.swift. Matches the app's
  // majority (cream) background — only the bottom tab bar is navy.
  backgroundColor: "#F5EFE3",
  ios: {
    // "never": the WKWebView IS the root view (see CAPBridgeViewController.
    // loadView — view = webView), full-bleed edge-to-edge. "always" made iOS
    // auto-reserve a scrollView contentInset the size of the safe area, top
    // and bottom — space that lives outside the DOM and gets painted with
    // the webview's own background (cream, set in SceneDelegate.swift), no
    // CSS could ever reach or resize it. "never" removes that native gutter
    // entirely; env(safe-area-inset-*) still reports the real device insets
    // regardless of this setting, so appShellScroll's own top padding (and
    // the tab bar's bottom padding) handle safe-area clearance in CSS.
    contentInset: "never",
  },
  plugins: {
    StatusBar: {
      // true (Capacitor's own default) — this was never set explicitly
      // during the working, scroll-free version. Setting it to false made
      // the status bar reserve its own space ON TOP OF contentInset's
      // native safe-area inset, double-offsetting the WebView and bringing
      // back the phantom scroll. overlay:true + contentInset:"always" is
      // the combination that actually worked.
      overlaysWebView: true,
    },
  },
};

export default config;
