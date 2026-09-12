import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.afranio.treinoapp",
  appName: "Treino & Dieta",
  webDir: "public",
  server: {
    // The app is dynamic (Supabase Auth, live data) — the WebView loads the
    // deployed site directly instead of a static bundle. `webDir` above is
    // unused at runtime but required by the CLI.
    url: "https://treino-app-snowy.vercel.app",
    cleartext: false,
  },
  ios: {
    contentInset: "always",
  },
};

export default config;
