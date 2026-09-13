import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";

/**
 * The status bar strip sits in native chrome above the WebView (Capacitor
 * insets the WebView below it — see capacitor.config.ts's ios.contentInset),
 * so CSS can't reach it; its background is colored navy directly in
 * SceneDelegate.swift (matches the bottom tab bar, framing the cream content
 * top and bottom). Since that strip is always navy regardless of which
 * screen is underneath, the icons stay light/white always too — Style.Dark
 * means light icons/text, the naming is inverted from what you'd expect.
 * setBackgroundColor is Android-only and a no-op on iOS; kept for Android.
 */
export async function configureStatusBar(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  await StatusBar.setStyle({ style: Style.Dark }).catch((err) => console.error("Falha ao definir o estilo da status bar:", err));
  await StatusBar.setBackgroundColor({ color: "#0D1B2A" }).catch(() => {
    // Expected to fail on iOS (Android-only API) — SceneDelegate.swift handles it there.
  });
}
