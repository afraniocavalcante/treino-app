"use client";

import { useEffect, useState } from "react";
import { OS_APPS, type OSApp } from "./Dock";

const MENU_HINT: Record<OSApp, string> = {
  hoje: "Ver",
  dieta: "Refeições",
  treino: "Programa",
  viagens: "Viagem",
  insights: "Período",
  ajustes: "Geral",
};

export default function MenuBar({ active }: { active: OSApp }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(t);
  }, []);
  const pad = (n: number) => String(n).padStart(2, "0");
  const day = now.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");
  const dayLabel = day.charAt(0).toUpperCase() + day.slice(1);
  const clock = `${dayLabel} ${now.getDate()}  ${pad(now.getHours())}:${pad(now.getMinutes())}`;

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: "calc(46px + env(safe-area-inset-top, 0px))",
        zIndex: 5,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        padding: "0 22px 8px",
        paddingTop: "env(safe-area-inset-top, 0px)",
        background: "rgba(245,239,227,.55)",
        backdropFilter: "blur(20px) saturate(1.4)",
        WebkitBackdropFilter: "blur(20px) saturate(1.4)",
        fontSize: 13,
        fontFamily: "-apple-system,BlinkMacSystemFont,'Helvetica Neue',Helvetica,sans-serif",
        color: "#0D1B2A",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <i className="ph-fill ph-circle-half" style={{ fontSize: 15 }} />
        <span style={{ fontWeight: 700 }}>{OS_APPS[active].name}</span>
        <span style={{ color: "#4A5866" }}>{MENU_HINT[active]}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 500 }}>
        <i className="ph-duotone ph-wifi-high" style={{ fontSize: 15 }} />
        <i className="ph-duotone ph-battery-full" style={{ fontSize: 17 }} />
        <span>{clock}</span>
      </div>
    </div>
  );
}
