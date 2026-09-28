export type WallpaperId = "areia" | "mare" | "salvia" | "rosa";

export interface WallpaperOption {
  id: WallpaperId;
  label: string;
  background: string;
}

export const WALLPAPERS: WallpaperOption[] = [
  {
    id: "areia",
    label: "Areia",
    background:
      "radial-gradient(70% 45% at 0% 8%,#FFF3DF 0%,transparent 70%),radial-gradient(70% 50% at 100% 30%,#F0B27A 0%,transparent 70%),radial-gradient(80% 50% at 0% 70%,#E8927C 0%,transparent 70%),radial-gradient(80% 45% at 100% 100%,#8FB5C4 0%,transparent 70%),#EAD7BE",
  },
  {
    id: "mare",
    label: "Maré",
    background: "radial-gradient(80% 50% at 0% 0%,#E6F1F4 0%,transparent 70%),radial-gradient(70% 50% at 100% 40%,#8FB5C4 0%,transparent 70%),#C9DCE2",
  },
  {
    id: "salvia",
    label: "Sálvia",
    background: "radial-gradient(80% 50% at 0% 0%,#EEF2EA 0%,transparent 70%),radial-gradient(70% 50% at 100% 60%,#A9C2A4 0%,transparent 70%),#D5E0D0",
  },
  {
    id: "rosa",
    label: "Rosa",
    background: "radial-gradient(80% 50% at 0% 0%,#FBEFEA 0%,transparent 70%),radial-gradient(70% 50% at 100% 60%,#E7A9A0 0%,transparent 70%),#F0D6CF",
  },
];

const STORAGE_KEY = "os-wallpaper";
const DEFAULT_WALLPAPER: WallpaperId = "areia";

function isWallpaperId(value: string | null): value is WallpaperId {
  return !!value && WALLPAPERS.some((w) => w.id === value);
}

export function getStoredWallpaper(): WallpaperId {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return isWallpaperId(raw) ? raw : DEFAULT_WALLPAPER;
  } catch {
    return DEFAULT_WALLPAPER;
  }
}

export function setStoredWallpaper(id: WallpaperId): void {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // localStorage indisponível — só não persiste entre sessões.
  }
}

export function wallpaperBackground(id: WallpaperId): string {
  return WALLPAPERS.find((w) => w.id === id)?.background ?? WALLPAPERS[0].background;
}
