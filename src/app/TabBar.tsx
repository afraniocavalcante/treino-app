"use client";

import { styles } from "@/lib/styles";
import { BarChartIcon, DumbbellIcon, HomeIcon, PlaneIcon, PlateIcon, SlidersIcon } from "./Icons";

export type AppTab = "hub" | "dieta" | "treino" | "viagens" | "insights" | "settings";

export const TABS: { key: AppTab; label: string; Icon: typeof HomeIcon }[] = [
  { key: "hub", label: "Hoje", Icon: HomeIcon },
  { key: "dieta", label: "Dieta", Icon: PlateIcon },
  { key: "treino", label: "Treino", Icon: DumbbellIcon },
  { key: "viagens", label: "Viagens", Icon: PlaneIcon },
  { key: "insights", label: "Insights", Icon: BarChartIcon },
  { key: "settings", label: "Config", Icon: SlidersIcon },
];

/** Persistent bottom navigation shown across the whole app, rendered once at the AppShell level. */
export default function TabBar({ active, onChange }: { active: AppTab; onChange: (tab: AppTab) => void }) {
  return (
    <div style={styles.hubBottomNav}>
      {TABS.map((t) => {
        const on = active === t.key;
        return (
          <button
            key={t.key}
            style={{ ...styles.hubNavBtn, ...(on ? styles.hubNavBtnActive : {}) }}
            onClick={() => onChange(t.key)}
          >
            <t.Icon size={21} color={on ? "var(--c-cream)" : "var(--c-mid-gray)"} />
            <span>{t.label}</span>
            <span style={{ ...styles.hubNavDot, ...(on ? styles.hubNavDotActive : {}) }} />
          </button>
        );
      })}
    </div>
  );
}
