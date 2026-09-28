"use client";

import { useSwipeDown } from "@/lib/gestures";

export default function FullScreenApp({
  show,
  page,
  name,
  sub,
  action,
  onClose,
  children,
}: {
  show: boolean;
  page: string;
  name: string;
  sub?: string;
  action?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const swipeDownRef = useSwipeDown(show ? onClose : null);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 4,
        display: show ? "block" : "none",
        overflow: "hidden",
        background: page,
        // O CSS reinicia a animação sozinho toda vez que `display` volta de
        // none pra block (mesmo truque já usado em SCREEN_ANIM/winOpen).
        animation: "appIn 340ms cubic-bezier(.2,.9,.25,1) both",
      }}
    >
      <div
        ref={swipeDownRef}
        style={{
          position: "absolute",
          inset: 0,
          overflowY: "auto",
          padding: "calc(54px + env(safe-area-inset-top, 0px)) 16px calc(150px + env(safe-area-inset-bottom, 0px))",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 48 }}>
          <button
            onClick={onClose}
            aria-label="Voltar para Hoje"
            style={{
              width: 44,
              height: 44,
              border: 0,
              borderRadius: "50%",
              display: "grid",
              placeItems: "center",
              background: "rgba(255,255,255,.4)",
              backdropFilter: "blur(12px) saturate(1.8)",
              WebkitBackdropFilter: "blur(12px) saturate(1.8)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,.9), 0 0 0 .5px rgba(28,28,30,.08), 0 6px 16px -8px rgba(28,28,30,.3)",
              color: "#1C1C1E",
              fontSize: 18,
              cursor: "pointer",
            }}
          >
            <i className="ph-duotone ph-caret-down" />
          </button>
          {action && (
            <span
              style={{
                minHeight: 44,
                padding: "0 16px",
                borderRadius: 22,
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: "rgba(255,255,255,.4)",
                backdropFilter: "blur(12px) saturate(1.8)",
                WebkitBackdropFilter: "blur(12px) saturate(1.8)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,.9), 0 0 0 .5px rgba(28,28,30,.08), 0 6px 16px -8px rgba(28,28,30,.3)",
                fontSize: 15,
                fontWeight: 600,
              }}
            >
              {action}
            </span>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", padding: "8px 4px 18px" }}>
          <span style={{ fontSize: 34, fontWeight: 700, letterSpacing: "-.025em" }}>{name}</span>
          {sub && <span style={{ fontSize: 15, color: "#57534E" }}>{sub}</span>}
        </div>
        {children}
      </div>
    </div>
  );
}
