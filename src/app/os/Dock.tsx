"use client";

import { Fragment } from "react";

export type OSApp = "hoje" | "dieta" | "treino" | "viagens" | "insights" | "ajustes";

export const OS_APPS: Record<OSApp, { name: string; icon: string; bg: string; fg: string; winBg: string; winBar: string }> = {
  hoje: { name: "Hoje", icon: "ph-sun-horizon", bg: "linear-gradient(160deg,#FBF6EC,#E4D9C6)", fg: "#C97B4A", winBg: "", winBar: "" },
  dieta: { name: "Dieta", icon: "ph-bowl-food", bg: "linear-gradient(160deg,#DE9565,#B8683A)", fg: "#FBF6EC", winBg: "#E4D9C6", winBar: "#EDE4D4" },
  treino: { name: "Treino", icon: "ph-barbell", bg: "linear-gradient(160deg,#243A55,#0D1B2A)", fg: "#F5EFE3", winBg: "#E4D9C6", winBar: "#EDE4D4" },
  viagens: { name: "Viagens", icon: "ph-airplane-tilt", bg: "linear-gradient(160deg,#FFFFFF,#E3E0E0)", fg: "#0088b0", winBg: "#f3f2f2", winBar: "#eae9e9" },
  insights: { name: "Insights", icon: "ph-chart-bar", bg: "linear-gradient(160deg,#E2C07E,#B8914A)", fg: "#0D1B2A", winBg: "#E4D9C6", winBar: "#EDE4D4" },
  ajustes: { name: "Ajustes", icon: "ph-gear-six", bg: "linear-gradient(160deg,#A3AAB4,#6B727C)", fg: "#FFFFFF", winBg: "#EFEFF2", winBar: "#E4E4E8" },
};

export const DOCK_ORDER: OSApp[] = ["hoje", "dieta", "treino", "viagens", "insights", "ajustes"];

export default function Dock({ active, onChange }: { active: OSApp; onChange: (app: OSApp) => void }) {
  return (
    <div style={{ position: "absolute", left: 12, right: 12, bottom: "calc(22px + env(safe-area-inset-bottom, 0px))", zIndex: 6, display: "flex", justifyContent: "center" }}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 10,
          padding: "8px 10px",
          borderRadius: 24,
          background: "rgba(245,239,227,.5)",
          backdropFilter: "blur(24px) saturate(1.5)",
          WebkitBackdropFilter: "blur(24px) saturate(1.5)",
          boxShadow: "0 0 0 .5px rgba(255,255,255,.6) inset, 0 10px 30px -10px rgba(13,27,42,.4)",
        }}
      >
        {DOCK_ORDER.map((id) => (
          <Fragment key={id}>
            {id === "ajustes" && <div style={{ width: 1, height: 40, alignSelf: "center", background: "rgba(13,27,42,.2)" }} />}
            <button
              onClick={() => onChange(id)}
              aria-label={OS_APPS[id].name}
              className="tab-press"
              style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, border: 0, padding: 0, background: "transparent", cursor: "pointer" }}
            >
              <div
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 12,
                  display: "grid",
                  placeItems: "center",
                  background: OS_APPS[id].bg,
                  color: OS_APPS[id].fg,
                  fontSize: 25,
                  boxShadow: "0 0 0 .5px rgba(13,27,42,.15), 0 3px 8px -2px rgba(13,27,42,.35)",
                }}
              >
                <i className={`ph-fill ${OS_APPS[id].icon}`} />
              </div>
              <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#0D1B2A", opacity: active === id ? 1 : 0 }} />
            </button>
          </Fragment>
        ))}
      </div>
    </div>
  );
}
