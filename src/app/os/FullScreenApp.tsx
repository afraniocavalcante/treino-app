"use client";

import type { CSSProperties } from "react";
import { useSwipeDown } from "@/lib/gestures";

// FullScreenApp sempre pinta um `page` claro (definido por app em Dock.tsx),
// independente do perfil de cor escolhido em Ajustes — os 7 perfis (inclusive
// os 3 escuros) foram desenhados pra quando Treino/Dieta/Insights tinham o
// próprio fundo full-screen. Hoje esses apps só herdam a cor de texto do tema
// (via --c-white etc. em src/lib/styles.ts) sem herdar mais o fundo escuro
// correspondente, o que deixava título e texto quase invisíveis (claro sobre
// claro) sempre que um tema escuro estava ativo. Sobrescrevendo essas
// variáveis aqui, pro valor do perfil Clássico, qualquer conteúdo dentro da
// janela sempre usa cor de texto compatível com o fundo claro que a própria
// janela garante.
const LIGHT_INK_VARS = {
  "--c-bg-card": "#ffffff",
  "--c-bg-header": "rgba(13, 27, 42, 0.08)",
  "--c-accent": "#0d1b2a",
  "--c-accent-dim": "#0d1b2a",
  "--c-white": "#0d1b2a",
  "--c-light-gray": "#4a5866",
  "--c-mid-gray": "#8b93a0",
  "--c-faint": "#8b93a0",
  "--c-line": "rgba(13, 27, 42, 0.08)",
} as CSSProperties;

export default function FullScreenApp({
  show,
  page,
  name,
  sub,
  action,
  onClose,
  children,
  bleed,
}: {
  show: boolean;
  page: string;
  name: string;
  sub?: string;
  action?: string;
  onClose: () => void;
  children: React.ReactNode;
  /** Apps com o próprio design full-bleed (ex.: Skin Care) dispensam o
   * cabeçalho grande e o padding padrão — só o botão de fechar flutua por
   * cima, e o app usa a janela inteira, do mesmo jeito que os outros. */
  bleed?: boolean;
}) {
  const swipeDownRef = useSwipeDown(show ? onClose : null);

  const closeButton = (
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
  );

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
        ...LIGHT_INK_VARS,
      }}
    >
      {bleed ? (
        <>
          <div ref={swipeDownRef} style={{ position: "absolute", inset: 0, overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
            {children}
          </div>
          <div style={{ position: "absolute", top: "calc(12px + env(safe-area-inset-top, 0px))", left: 16, zIndex: 1 }}>{closeButton}</div>
        </>
      ) : (
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
            {closeButton}
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
                  color: "#1C1C1E",
                }}
              >
                {action}
              </span>
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", padding: "8px 4px 18px" }}>
            <span style={{ fontSize: 34, fontWeight: 700, letterSpacing: "-.025em", color: "#1C1C1E" }}>{name}</span>
            {sub && <span style={{ fontSize: 15, color: "#57534E" }}>{sub}</span>}
          </div>
          {children}
        </div>
      )}
    </div>
  );
}
