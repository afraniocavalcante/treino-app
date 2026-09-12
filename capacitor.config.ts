import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.afranio.treinoapp",
  appName: "Treino & Dieta",
  // Fully static build (next.config.ts: output "export") bundled locally —
  // the app launches instantly and its shell works offline. Only the actual
  // Supabase calls (auth, reading/saving data) need a network connection.
  webDir: "out",
  ios: {
    contentInset: "always",
  },
};

export default config;
