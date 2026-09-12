"use client";

import { useEffect, useState } from "react";

/** Tracks navigator.onLine, updated live via the browser's online/offline events. */
export function useOnline(): boolean {
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
 */
export async function loadWithCache<T>(key: string, fetcher: () => Promise<T>): Promise<{ data: T; offline: boolean }> {
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
