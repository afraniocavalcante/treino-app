import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";

/**
 * The status bar strip sits in native chrome above the WebView (Capacitor
 * insets the WebView below it — see capacitor.config.ts's ios.contentInset),
 * so CSS can't reach it; its background is colored cream directly in
 * SceneDelegate.swift, matching the app's majority background (only the
 * bottom tab bar is navy). Since that strip is always cream regardless of
 * which screen is underneath, the icons stay dark always too — Style.Light
 * means dark icons/text, the naming is inverted from what you'd expect.
 * setBackgroundColor is Android-only and a no-op on iOS; kept for Android.
 */
export async function configureStatusBar(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  await StatusBar.setStyle({ style: Style.Light }).catch((err) => console.error("Falha ao definir o estilo da status bar:", err));
  await StatusBar.setBackgroundColor({ color: "#F5EFE3" }).catch(() => {
    // Expected to fail on iOS (Android-only API) — SceneDelegate.swift handles it there.
  });
}
