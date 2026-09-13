"use client";

import { useEffect } from "react";

/**
 * Mirrors the actual window.innerHeight into a CSS custom property. Needed
 * because 100dvh can be measured before the WKWebView's safe-area insetting
 * has settled right after launch — briefly reporting a taller value than
 * what's really visible, which pushes fixed-height layouts (like the app
 * shell) past the bottom of the screen until something forces a reflow.
 * window.innerHeight, read from JS after mount, is already settled.
 */
export function useViewportHeight(): void {
  useEffect(() => {
    function apply() {
      document.documentElement.style.setProperty("--app-vh", `${window.innerHeight}px`);
    }
    apply();
    window.addEventListener("resize", apply);
    window.addEventListener("orientationchange", apply);
    return () => {
      window.removeEventListener("resize", apply);
      window.removeEventListener("orientationchange", apply);
    };
  }, []);
}
