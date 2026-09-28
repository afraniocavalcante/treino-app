"use client";

import type { TabId } from "../lib/types";
import { TabIcon } from "./icons";

const TABS: { id: TabId; label: string }[] = [
  { id: "hoje", label: "Hoje" },
  { id: "produtos", label: "Produtos" },
  { id: "rotinas", label: "Rotinas" },
  { id: "log", label: "Skin Log" },
  { id: "insights", label: "Insights" },
];

// Substitui a tab bar fixa original (o Dock do Personal OS já é a barra fixa
// do app aberto) por um controle segmentado no topo da tela, mesmo espírito
// das sub-abas Dieta/Treino em Settings.tsx.
export function SkinCareTabs({ active, onSelect }: { active: TabId; onSelect: (tab: TabId) => void }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${TABS.length}, 1fr)`, gap: 4, padding: "4px 0 18px" }}>
      {TABS.map((t) => {
        const isActive = t.id === active;
        const color = isActive ? "#191715" : "#5C5245";
        return (
          <button
            key={t.id}
            onClick={() => onSelect(t.id)}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
              padding: "8px 0",
              borderRadius: 5,
              background: isActive ? "#F5F0E8" : "transparent",
            }}
          >
            <div style={{ opacity: isActive ? 1 : 0.6, transition: "opacity 200ms ease" }}>
              <TabIcon tab={t.id} color={color} />
            </div>
            <span style={{ fontSize: 9.5, letterSpacing: ".05em", color, fontWeight: isActive ? 500 : 300 }}>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}
