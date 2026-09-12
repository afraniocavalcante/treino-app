"use client";

import { createContext, useContext, useEffect, useState } from "react";

/** Tracks navigator.onLine, updated live via the browser's online/offline events. */
function useOnlineState(): boolean {
  const [online, setOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  return online;
}

const OnlineContext = createContext<boolean | null>(null);

/**
 * Provides one shared connectivity reading for the whole app, set up once at the
 * root (AuthGate) instead of each screen detecting it independently. Every screen
 * reads the same value the instant it mounts, instead of each running its own
 * "try network, wait, fall back" cycle.
 */
export function OnlineProvider({ children }: { children: React.ReactNode }) {
  const online = useOnlineState();
  return <OnlineContext.Provider value={online}>{children}</OnlineContext.Provider>;
}

/** Reads the shared connectivity state set up by OnlineProvider at the app root. */
export function useOnline(): boolean {
  const ctx = useContext(OnlineContext);
  return ctx ?? true;
}

const CACHE_PREFIX = "treino-cache:";

export function setCached<T>(key: string, data: T): void {
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(data));
  } catch {
    // storage full or unavailable — the app just won't have offline data for this key.
  }
}

export function getCached<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function warnOffline(): void {
  if (typeof window !== "undefined") {
    window.alert("Sem conexão — o app está em modo de visualização e não salva mudanças agora.");
  }
}

/** Call before any write. Returns true (and warns) if offline, so the caller should bail out. */
export function guardOffline(online: boolean): boolean {
  if (!online) {
    warnOffline();
    return true;
  }
  return false;
}

/**
 * Runs `fetcher`; on success, caches and returns the fresh data (offline: false).
 * On failure, falls back to whatever was last cached under `key` (offline: true).
 * Rethrows only if there's nothing cached to fall back to.
 *
 * When `online` is already known false (from useOnline(), read at the top of the
 * app), skips the network attempt entirely and goes straight to cache — a Supabase
 * call with no connection doesn't fail instantly, it hangs until it times out, which
 * otherwise shows a loading spinner for several seconds before falling back.
 */
export async function loadWithCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  online: boolean = true
): Promise<{ data: T; offline: boolean }> {
  if (!online) {
    const cached = getCached<T>(key);
    if (cached) return { data: cached, offline: true };
    // No connection and nothing cached yet — only option is to still try.
  }
  try {
    const data = await fetcher();
    setCached(key, data);
    return { data, offline: false };
  } catch (err) {
    const cached = getCached<T>(key);
    if (cached) return { data: cached, offline: true };
    throw err;
  }
}
