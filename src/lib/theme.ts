export type ThemeId = "classico" | "meia-noite" | "aurora" | "ember";

export interface ThemeOption {
  id: ThemeId;
  label: string;
  preview: { bg: string; accent: string; honey: string };
}

export const THEMES: ThemeOption[] = [
  { id: "classico", label: "Clássico", preview: { bg: "#E4D9C6", accent: "#0D1B2A", honey: "#C97B4A" } },
  { id: "meia-noite", label: "Meia-noite", preview: { bg: "#0A0E14", accent: "#6C63FF", honey: "#FF6B5B" } },
  { id: "aurora", label: "Aurora", preview: { bg: "#0B1B1E", accent: "#3DDC97", honey: "#FF8674" } },
  { id: "ember", label: "Ember", preview: { bg: "#141110", accent: "#FF7A3D", honey: "#FF5A5F" } },
];

const STORAGE_KEY = "color-theme";
const DEFAULT_THEME: ThemeId = "classico";

function isThemeId(value: string | null): value is ThemeId {
  return !!value && THEMES.some((t) => t.id === value);
}

export function getStoredTheme(): ThemeId {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return isThemeId(raw) ? raw : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

export function setStoredTheme(id: ThemeId): void {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // localStorage indisponível (modo privado etc.) — tema só não persiste entre sessões.
  }
}

export function applyTheme(id: ThemeId): void {
  if (id === DEFAULT_THEME) {
    document.documentElement.removeAttribute("data-theme");
  } else {
    document.documentElement.setAttribute("data-theme", id);
  }
}
