import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";

/**
 * On iOS the status bar is always a transparent overlay — setBackgroundColor
 * is Android-only and throws/no-ops on iOS. The actual "background" behind it
 * is whatever the WebView itself draws, which is why capacitor.config.ts sets
 * ios.contentInset to "never" (full-bleed WebView) and overlaysWebView: true
 * — the page's own CSS background (cream/navy) then shows through, with
 * env(safe-area-inset-top) padding keeping content clear of the notch.
 * setStyle (icon color) does work on both platforms. Style.Light means dark
 * icons/text (for the cream pages), Style.Dark means light icons/text (for
 * the navy login screen) — the naming is inverted from what you'd expect.
 */
export async function configureStatusBar(variant: "cream" | "navy"): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  const color = variant === "navy" ? "#0D1B2A" : "#F5EFE3";
  const style = variant === "navy" ? Style.Dark : Style.Light;
  await StatusBar.setStyle({ style }).catch((err) => console.error("Falha ao definir o estilo da status bar:", err));
  await StatusBar.setBackgroundColor({ color }).catch(() => {
    // Expected to fail on iOS (Android-only API) — the WebView's own background handles it there.
  });
}
