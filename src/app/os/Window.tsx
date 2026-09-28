"use client";

export default function Window({
  show,
  name,
  bg,
  bar,
  onClose,
  children,
}: {
  show: boolean;
  name: string;
  bg: string;
  bar: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        position: "absolute",
        top: "calc(54px + env(safe-area-inset-top, 0px))",
        left: 8,
        right: 8,
        bottom: "calc(100px + env(safe-area-inset-bottom, 0px))",
        zIndex: 4,
        display: show ? "flex" : "none",
        flexDirection: "column",
        borderRadius: 16,
        overflow: "hidden",
        background: bg,
        boxShadow: "0 0 0 .5px rgba(13,27,42,.25), 0 24px 60px -20px rgba(13,27,42,.55)",
        transformOrigin: "50% 100%",
        // O CSS reinicia a animação sozinho toda vez que `display` volta de
        // none pra block/flex (mesmo truque de SCREEN_ANIM em src/lib/styles.ts).
        animation: "winOpen 260ms cubic-bezier(.2,.8,.3,1) both",
      }}
    >
      <div
        style={{
          flexShrink: 0,
          height: 40,
          display: "grid",
          gridTemplateColumns: "80px 1fr 80px",
          alignItems: "center",
          padding: "0 12px",
          background: bar,
          borderBottom: "0.5px solid rgba(13,27,42,.12)",
        }}
      >
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={onClose}
            aria-label="Fechar"
            style={{ width: 14, height: 14, padding: 0, borderRadius: "50%", border: "0.5px solid rgba(0,0,0,.18)", background: "#FF5F57", cursor: "pointer" }}
          />
          <button
            onClick={onClose}
            aria-label="Minimizar"
            style={{ width: 14, height: 14, padding: 0, borderRadius: "50%", border: "0.5px solid rgba(0,0,0,.18)", background: "#FEBC2E", cursor: "pointer" }}
          />
          <span style={{ width: 14, height: 14, borderRadius: "50%", border: "0.5px solid rgba(0,0,0,.18)", background: "#28C840" }} />
        </div>
        <span style={{ textAlign: "center", fontSize: 13, fontWeight: 600, color: "#0D1B2A" }}>{name}</span>
        <span />
      </div>
      <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>{children}</div>
    </div>
  );
}
