"use client";

import { useMemo, useState } from "react";
import { useSwipeDown } from "@/lib/gestures";
import { OS_APPS, type OSApp } from "./Dock";

const LIBRARY_ORDER: OSApp[] = ["hoje", "dieta", "treino", "viagens", "insights", "ajustes"];
const SKINCARE = { name: "Skin Care", icon: "ph-drop-half", bg: "linear-gradient(160deg,#F6D3CF,#E39A9A)", fg: "#FFFFFF" };

export default function Library({ open, onClose, onOpenApp }: { open: boolean; onClose: () => void; onOpenApp: (app: OSApp) => void }) {
  const [query, setQuery] = useState("");
  const swipeDownRef = useSwipeDown(open ? onClose : null);

  const entries = useMemo(() => {
    const all: { key: string; name: string; icon: string; bg: string; fg: string; onOpen: (() => void) | null }[] = [
      ...LIBRARY_ORDER.map((id) => ({ key: id, name: OS_APPS[id].name, icon: OS_APPS[id].icon, bg: OS_APPS[id].bg, fg: OS_APPS[id].fg, onOpen: () => onOpenApp(id) })),
    ];
    // Skin Care entra na ordem certa (antes de Ajustes), sem ação — ainda não existe.
    all.splice(5, 0, { key: "skincare", name: SKINCARE.name, icon: SKINCARE.icon, bg: SKINCARE.bg, fg: SKINCARE.fg, onOpen: null });
    const q = query.trim().toLowerCase();
    return q ? all.filter((a) => a.name.toLowerCase().includes(q)) : all;
  }, [query, onOpenApp]);

  return (
    <div
      onClick={onClose}
      ref={swipeDownRef}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 10,
        background: "rgba(255,248,240,.18)",
        backdropFilter: "blur(28px) saturate(1.6)",
        WebkitBackdropFilter: "blur(28px) saturate(1.6)",
        opacity: open ? 1 : 0,
        pointerEvents: open ? "auto" : "none",
        transition: "opacity 280ms ease",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "absolute",
          inset: 0,
          padding: "calc(70px + env(safe-area-inset-top, 0px)) 22px calc(60px + env(safe-area-inset-bottom, 0px))",
          display: "flex",
          flexDirection: "column",
          gap: 26,
          transform: open ? "none" : "translateY(60px) scale(.96)",
          transition: "transform 380ms cubic-bezier(.2,.9,.25,1)",
        }}
      >
        <div
          style={{
            alignSelf: "center",
            width: "100%",
            minHeight: 40,
            borderRadius: 20,
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "0 14px",
            boxSizing: "border-box",
            background: "rgba(255,255,255,.35)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,.9), 0 0 0 .5px rgba(255,255,255,.5)",
            color: "#57534E",
            fontSize: 17,
          }}
        >
          <i className="ph-duotone ph-magnifying-glass" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar apps"
            style={{ flex: 1, border: 0, background: "transparent", outline: "none", font: "inherit", color: "#1C1C1E" }}
          />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "26px 10px" }}>
          {entries.map((a) => (
            <button
              key={a.key}
              onClick={() => a.onOpen?.()}
              aria-label={a.name}
              className="tab-press"
              disabled={!a.onOpen}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 7, border: 0, padding: 0, background: "transparent", cursor: a.onOpen ? "pointer" : "default", font: "inherit", color: "#1C1C1E" }}
            >
              <div
                style={{
                  position: "relative",
                  width: 64,
                  height: 64,
                  borderRadius: 15,
                  display: "grid",
                  placeItems: "center",
                  background: a.bg,
                  color: a.fg,
                  fontSize: 32,
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,.5), 0 0 0 .5px rgba(28,28,30,.12), 0 6px 14px -6px rgba(28,28,30,.4)",
                  opacity: a.onOpen ? 1 : 0.6,
                }}
              >
                <i className={`ph-fill ${a.icon}`} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 500, whiteSpace: "nowrap" }}>{a.name}</span>
            </button>
          ))}
        </div>
        <span style={{ marginTop: "auto", alignSelf: "center", fontSize: 13, color: "#57534E" }}>Toque fora para voltar</span>
      </div>
    </div>
  );
}
