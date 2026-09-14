import { useCallback, useEffect, useRef, type RefObject } from "react";

const SWIPE_MIN_DX = 60;
const SWIPE_MAX_DY_RATIO = 1.5; // |dx| precisa ser pelo menos 1.5x |dy| pra contar como horizontal
const EDGE_ZONE_PX = 24;
const EDGE_SWIPE_MIN_DX = 40;

/** Verdadeiro se o alvo (ou algum ancestral até `root`) tem scroll horizontal
 * próprio — protege listas horizontais (ex. seletor de semanas) do gesto global. */
function hasOwnHorizontalScroll(target: EventTarget | null, root: HTMLElement): boolean {
  let el = target instanceof Element ? target : null;
  while (el && el !== root.parentElement) {
    if (el instanceof HTMLElement && el.scrollWidth > el.clientWidth + 1) return true;
    if (el === root) break;
    el = el.parentElement;
  }
  return false;
}

/**
 * Deslizar pra esquerda/direita sobre o conteúdo troca de módulo — o gesto
 * apenas DISPARA a troca (não arrasta o conteúdo junto do dedo), pra não
 * precisar reestruturar o appShell numa faixa horizontal arriscando os
 * bugs de layout/scroll que esse shell já teve.
 */
export function useHorizontalTabSwipe(
  ref: RefObject<HTMLElement | null>,
  onSwipeLeft: () => void,
  onSwipeRight: () => void
): void {
  const stateRef = useRef<{ x: number; y: number; tracking: boolean } | null>(null);
  const callbacksRef = useRef({ onSwipeLeft, onSwipeRight });
  useEffect(() => {
    callbacksRef.current = { onSwipeLeft, onSwipeRight };
  });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    function onPointerDown(e: PointerEvent) {
      if (e.pointerType !== "touch" && e.pointerType !== "pen") return;
      if (hasOwnHorizontalScroll(e.target, el!)) {
        stateRef.current = null;
        return;
      }
      stateRef.current = { x: e.clientX, y: e.clientY, tracking: true };
    }

    function onPointerUp(e: PointerEvent) {
      const start = stateRef.current;
      stateRef.current = null;
      if (!start?.tracking) return;
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      if (Math.abs(dx) < SWIPE_MIN_DX || Math.abs(dx) < Math.abs(dy) * SWIPE_MAX_DY_RATIO) return;
      if (dx < 0) callbacksRef.current.onSwipeLeft();
      else callbacksRef.current.onSwipeRight();
    }

    function onPointerCancel() {
      stateRef.current = null;
    }

    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointerup", onPointerUp);
    el.addEventListener("pointercancel", onPointerCancel);
    return () => {
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointerup", onPointerUp);
      el.removeEventListener("pointercancel", onPointerCancel);
    };
  }, [ref]);
}

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
