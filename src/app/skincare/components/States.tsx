"use client";

export function EmptyState({
  title,
  body,
  shape = "circle",
  cta,
}: {
  title: string;
  body: string;
  shape?: "circle" | "square";
  cta?: { label: string; onClick: () => void };
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 14,
        padding: shape === "circle" ? "74px 40px" : "66px 40px",
        textAlign: "center",
      }}
    >
      {shape === "circle" ? (
        <svg width="46" height="46" viewBox="0 0 46 46">
          <circle cx="23" cy="23" r="22" fill="none" stroke="#CDC4B6" strokeWidth="1.2" strokeDasharray="4 5" />
        </svg>
      ) : (
        <svg width="46" height="46" viewBox="0 0 46 46">
          <rect x="1" y="1" width="44" height="44" fill="none" stroke="#CDC4B6" strokeWidth="1.2" strokeDasharray="4 5" />
        </svg>
      )}
      <div style={{ fontSize: 16, fontWeight: 400 }}>{title}</div>
      <div style={{ fontSize: 13, fontWeight: 300, color: "#5C5245", lineHeight: 1.6, maxWidth: 250 }}>{body}</div>
      {cta && (
        <button
          onClick={cta.onClick}
          style={{
            marginTop: 4,
            fontSize: 12.5,
            letterSpacing: ".06em",
            textTransform: "uppercase",
            padding: "11px 20px",
            borderRadius: 999,
            background: "#191715",
            color: "#FFFFFF",
          }}
        >
          {cta.label}
        </button>
      )}
    </div>
  );
}

export function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      style={{
        margin: "18px 0 0",
        padding: "16px 18px",
        background: "#FFFFFF",
        border: "1px solid #E0BCA9",
        borderRadius: 5,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div style={{ fontSize: 14, color: "#8E3D1E" }}>Não foi possível carregar seus produtos</div>
      <div style={{ fontSize: 12.5, fontWeight: 300, color: "#4A423A", lineHeight: 1.5 }}>
        Verifique a conexão e tente novamente.
      </div>
      <button
        onClick={onRetry}
        style={{
          alignSelf: "flex-start",
          fontSize: 12,
          letterSpacing: ".06em",
          textTransform: "uppercase",
          padding: "8px 14px",
          border: "1px solid #8E3D1E",
          borderRadius: 999,
          color: "#8E3D1E",
        }}
      >
        tentar de novo
      </button>
    </div>
  );
}

export function LoadingSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "18px 0 0" }}>
      {[0, 1, 2].map((k) => (
        <div
          key={k}
          className="anim-breathe"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            background: "#FFFFFF",
            border: "1px solid #D3CABB",
            borderRadius: 5,
            padding: "14px 16px",
          }}
        >
          <div style={{ width: 56, height: 56, borderRadius: 999, background: "#F0EAE0", flex: "none" }} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ height: 10, width: "62%", borderRadius: 2, background: "#F0EAE0" }} />
            <div style={{ height: 8, width: "38%", borderRadius: 2, background: "#F5F0E8" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// position:absolute (não fixed) — fica contido dentro da janela do app
// (FullScreenApp), que é quem estabelece o "viewport" aqui dentro do shell
// do Personal OS. bottom afastado o bastante pro Dock do OS, que continua
// visível por cima do app aberto.
export function Fab({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        position: "absolute",
        right: 20,
        bottom: "calc(160px + env(safe-area-inset-bottom, 0px))",
        width: 54,
        height: 54,
        borderRadius: 999,
        background: "#191715",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 2px 10px rgba(25,23,21,.14)",
        zIndex: 3,
      }}
    >
      <svg width="20" height="20" viewBox="0 0 20 20">
        <line x1="10" y1="3" x2="10" y2="17" stroke="#FFFFFF" strokeWidth="1.3" />
        <line x1="3" y1="10" x2="17" y2="10" stroke="#FFFFFF" strokeWidth="1.3" />
      </svg>
    </button>
  );
}
