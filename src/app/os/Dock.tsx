"use client";

import { useRef } from "react";

export type OSApp = "hoje" | "dieta" | "treino" | "viagens" | "insights" | "ajustes";

export const OS_APPS: Record<OSApp, { name: string; icon: string; bg: string; fg: string; page: string }> = {
  hoje: { name: "Hoje", icon: "ph-sun-horizon", bg: "linear-gradient(160deg,#FFF8EC,#EBDCC4)", fg: "#C97B4A", page: "" },
  dieta: { name: "Dieta", icon: "ph-bowl-food", bg: "linear-gradient(160deg,#E8A070,#B8683A)", fg: "#FFF8EC", page: "#F4EFE8" },
  treino: { name: "Treino", icon: "ph-barbell", bg: "linear-gradient(160deg,#34496A,#16233A)", fg: "#FFF8EC", page: "#F1EFEC" },
  viagens: { name: "Viagens", icon: "ph-airplane-tilt", bg: "linear-gradient(160deg,#FFFFFF,#E3E0E0)", fg: "#0088b0", page: "#f3f2f2" },
  insights: { name: "Insights", icon: "ph-chart-bar", bg: "linear-gradient(160deg,#EAC985,#B8914A)", fg: "#1C1C1E", page: "#F4F0E8" },
  ajustes: { name: "Ajustes", icon: "ph-gear-six", bg: "linear-gradient(160deg,#B3B8BF,#6B727C)", fg: "#FFFFFF", page: "#F2F2F4" },
};

export const DOCK_ORDER: OSApp[] = ["hoje", "dieta", "treino", "viagens", "insights"];

const DRAG_OPEN_THRESHOLD = 36;

export default function Dock({ active, libraryOpen, onChange, onOpenLibrary }: { active: OSApp; libraryOpen: boolean; onChange: (app: OSApp) => void; onOpenLibrary: () => void }) {
  const dragStartY = useRef<number | null>(null);
  const draggedOpen = useRef(false);

  return (
    <div
      onPointerDown={(e) => {
        dragStartY.current = e.clientY;
        draggedOpen.current = false;
      }}
      onPointerMove={(e) => {
        if (dragStartY.current != null && dragStartY.current - e.clientY > DRAG_OPEN_THRESHOLD && !libraryOpen) {
          draggedOpen.current = true;
          dragStartY.current = null;
          onOpenLibrary();
        }
      }}
      onPointerUp={() => {
        dragStartY.current = null;
      }}
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        height: 140,
        zIndex: 9,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-end",
        gap: 8,
        paddingBottom: "calc(26px + env(safe-area-inset-bottom, 0px))",
        touchAction: "none",
        transform: libraryOpen ? "translateY(40px)" : "none",
        opacity: libraryOpen ? 0 : 1,
        transition: "transform 320ms cubic-bezier(.2,.9,.25,1), opacity 220ms ease",
        pointerEvents: libraryOpen ? "none" : "auto",
      }}
    >
      <button
        onClick={onOpenLibrary}
        aria-label="Abrir biblioteca de apps"
        style={{ width: 64, height: 22, border: 0, background: "transparent", display: "grid", placeItems: "center", cursor: "pointer", padding: 0 }}
      >
        <span style={{ width: 40, height: 5, borderRadius: 3, background: "rgba(28,28,30,.35)" }} />
      </button>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "10px 12px",
          borderRadius: 34,
          background: "rgba(255,255,255,.26)",
          backdropFilter: "blur(16px) saturate(1.9)",
          WebkitBackdropFilter: "blur(16px) saturate(1.9)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,.9), inset 0 -1px 1px rgba(255,255,255,.35), 0 0 0 .5px rgba(255,255,255,.5), 0 14px 34px -12px rgba(60,35,15,.45)",
        }}
      >
        {DOCK_ORDER.map((id) => (
          <button
            key={id}
            onClick={() => onChange(id)}
            aria-label={OS_APPS[id].name}
            className="tab-press"
            style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", border: 0, padding: 0, background: "transparent", cursor: "pointer" }}
          >
            <div
              style={{
                width: 54,
                height: 54,
                borderRadius: 13,
                display: "grid",
                placeItems: "center",
                background: OS_APPS[id].bg,
                color: OS_APPS[id].fg,
                fontSize: 28,
                boxShadow: "inset 0 1px 0 rgba(255,255,255,.5), 0 0 0 .5px rgba(28,28,30,.12), 0 4px 10px -4px rgba(28,28,30,.4)",
              }}
            >
              <i className={`ph-fill ${OS_APPS[id].icon}`} />
            </div>
            <span style={{ position: "absolute", bottom: -7, width: 4, height: 4, borderRadius: "50%", background: "#1C1C1E", opacity: active === id ? 1 : 0 }} />
          </button>
        ))}
      </div>
    </div>
  );
}
