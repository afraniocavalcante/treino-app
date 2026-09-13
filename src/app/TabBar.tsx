"use client";

import { styles } from "@/lib/styles";

export type AppTab = "hub" | "dieta" | "treino" | "settings";

const TABS: { key: AppTab; label: string; icon: string }[] = [
  { key: "hub", label: "Hoje", icon: "🏠" },
  { key: "dieta", label: "Dieta", icon: "🍽️" },
  { key: "treino", label: "Treino", icon: "🏋️" },
  { key: "settings", label: "Config", icon: "⚙️" },
];

/** Persistent bottom navigation shown across the whole app, rendered once at the AppShell level. */
export default function TabBar({ active, onChange }: { active: AppTab; onChange: (tab: AppTab) => void }) {
  return (
    <div style={styles.hubBottomNav}>
      {TABS.map((t) => (
        <button
          key={t.key}
          style={{ ...styles.hubNavBtn, ...(active === t.key ? styles.hubNavBtnActive : {}) }}
          onClick={() => onChange(t.key)}
        >
          <span style={styles.hubNavIcon}>{t.icon}</span>
          <span>{t.label}</span>
        </button>
      ))}
    </div>
  );
}
