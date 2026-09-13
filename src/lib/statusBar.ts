import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";

/**
 * The native status bar has its own opaque background (white by default),
 * separate from the web page — without this it shows as a plain white bar
 * that doesn't match whatever screen is under it. Style.Light means dark
 * icons/text (for the cream pages), Style.Dark means light icons/text (for
 * the navy login screen) — the naming is inverted from what you'd expect.
 */
export async function configureStatusBar(variant: "cream" | "navy"): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    if (variant === "navy") {
      await StatusBar.setBackgroundColor({ color: "#0D1B2A" });
      await StatusBar.setStyle({ style: Style.Dark });
    } else {
      await StatusBar.setBackgroundColor({ color: "#F5EFE3" });
      await StatusBar.setStyle({ style: Style.Light });
    }
  } catch (err) {
    console.error("Falha ao configurar a status bar:", err);
  }
}
