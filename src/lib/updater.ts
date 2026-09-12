import { CapacitorUpdater } from "@capgo/capacitor-updater";
import { isNativePlatform } from "./notifications";

const UPDATE_MANIFEST_URL = "https://treino-app-snowy.vercel.app/updates.json";

export interface UpdateManifest {
  version: string;
  url: string;
}

/** The web bundle version baked in at build time (see scripts/deploy.mjs). */
export function getCurrentVersion(): string {
  return process.env.NEXT_PUBLIC_BUILD_VERSION ?? "dev";
}

/** Tells the plugin the current bundle loaded fine — skip this and it may roll back on next launch. */
export async function notifyAppReady(): Promise<void> {
  if (!isNativePlatform()) return;
  try {
    await CapacitorUpdater.notifyAppReady();
  } catch (err) {
    console.error("notifyAppReady falhou:", err);
  }
}

export interface UpdateCheckResult {
  available: boolean;
  currentVersion: string;
  manifest?: UpdateManifest;
}

/** Compares the running build's baked-in version against the manifest published at each deploy. */
export async function checkForUpdate(): Promise<UpdateCheckResult> {
  const currentVersion = getCurrentVersion();
  const res = await fetch(`${UPDATE_MANIFEST_URL}?t=${Date.now()}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Não foi possível verificar atualizações (${res.status}).`);
  const manifest = (await res.json()) as UpdateManifest;
  return { available: manifest.version !== currentVersion, currentVersion, manifest };
}

/** Downloads and activates a new bundle. Resolves right before the app reloads with the new content. */
export async function applyUpdate(manifest: UpdateManifest): Promise<void> {
  if (!isNativePlatform()) throw new Error("Atualização OTA só funciona no app nativo.");
  const bundle = await CapacitorUpdater.download({ url: manifest.url, version: manifest.version });
  await CapacitorUpdater.set({ id: bundle.id });
}
