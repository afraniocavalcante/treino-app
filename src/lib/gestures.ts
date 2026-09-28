import { useCallback, useEffect, useRef } from "react";

const SWIPE_MAX_DY_RATIO = 1.5; // |dx| precisa ser pelo menos 1.5x |dy| pra contar como horizontal
const EDGE_ZONE_PX = 24;
const EDGE_SWIPE_MIN_DX = 40;

/**
 * Puxar da borda esquerda da tela pra voltar — espelha o gesto nativo de
 * "voltar" do iOS. `onBack` é sempre a mesma função já ligada ao botão de
 * voltar visível daquela tela (nunca uma lógica de navegação nova); passe
 * `null` quando não há pra onde voltar.
 *
 * Devolve uma callback ref (não um RefObject) de propósito: em componentes
 * como WorkoutApp.tsx, cada "tela" é um `return` cedo com sua própria div
 * raiz — o nó do DOM muda a cada troca de tela, mesmo esse hook sendo
 * chamado uma vez só no topo do componente. Uma callback ref é chamada de
 * novo pelo React a cada montagem/desmontagem de nó, então o listener é
 * sempre reanexado ao elemento certo; um RefObject comum não disparia de
 * novo (o efeito só reagiria a mudanças de `onBack`, não do nó em si).
 */
export function useEdgeSwipeBack(onBack: (() => void) | null): (node: HTMLElement | null) => void {
  const onBackRef = useRef(onBack);
  useEffect(() => {
    onBackRef.current = onBack;
  });
  const cleanupRef = useRef<(() => void) | null>(null);

  return useCallback((node: HTMLElement | null) => {
    cleanupRef.current?.();
    cleanupRef.current = null;
    if (!node) return;

    let start: { x: number; y: number } | null = null;

    function onPointerDown(e: PointerEvent) {
      if (e.pointerType !== "touch" && e.pointerType !== "pen") return;
      const rect = node!.getBoundingClientRect();
      if (e.clientX - rect.left > EDGE_ZONE_PX) return;
      start = { x: e.clientX, y: e.clientY };
    }

    function onPointerUp(e: PointerEvent) {
      const from = start;
      start = null;
      if (!from) return;
      const dx = e.clientX - from.x;
      const dy = e.clientY - from.y;
      if (dx < EDGE_SWIPE_MIN_DX || Math.abs(dx) < Math.abs(dy) * SWIPE_MAX_DY_RATIO) return;
      onBackRef.current?.();
    }

    function onPointerCancel() {
      start = null;
    }

    node.addEventListener("pointerdown", onPointerDown);
    node.addEventListener("pointerup", onPointerUp);
    node.addEventListener("pointercancel", onPointerCancel);
    cleanupRef.current = () => {
      node.removeEventListener("pointerdown", onPointerDown);
      node.removeEventListener("pointerup", onPointerUp);
      node.removeEventListener("pointercancel", onPointerCancel);
    };
  }, []);
}

const SWIPE_DOWN_MIN_DY = 60;

/**
 * Deslizar pra baixo fecha — usado no app em tela cheia (src/app/os/FullScreenApp.tsx)
 * e na Biblioteca (src/app/os/Library.tsx), espelhando o gesto nativo do iOS.
 * Mesmo padrão de callback ref de `useEdgeSwipeBack` (o nó pode remontar).
 */
export function useSwipeDown(onClose: (() => void) | null): (node: HTMLElement | null) => void {
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });
  const cleanupRef = useRef<(() => void) | null>(null);

  return useCallback((node: HTMLElement | null) => {
    cleanupRef.current?.();
    cleanupRef.current = null;
    if (!node) return;

    let start: { x: number; y: number } | null = null;

    function onPointerDown(e: PointerEvent) {
      if (e.pointerType !== "touch" && e.pointerType !== "pen") return;
      start = { x: e.clientX, y: e.clientY };
    }

    function onPointerUp(e: PointerEvent) {
      const from = start;
      start = null;
      if (!from) return;
      const dx = e.clientX - from.x;
      const dy = e.clientY - from.y;
      if (dy < SWIPE_DOWN_MIN_DY || Math.abs(dy) < Math.abs(dx) * SWIPE_MAX_DY_RATIO) return;
      onCloseRef.current?.();
    }

    function onPointerCancel() {
      start = null;
    }

    node.addEventListener("pointerdown", onPointerDown);
    node.addEventListener("pointerup", onPointerUp);
    node.addEventListener("pointercancel", onPointerCancel);
    cleanupRef.current = () => {
      node.removeEventListener("pointerdown", onPointerDown);
      node.removeEventListener("pointerup", onPointerUp);
      node.removeEventListener("pointercancel", onPointerCancel);
    };
  }, []);
}
