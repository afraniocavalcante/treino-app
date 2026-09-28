"use client";

import { useRef, useState, type PointerEvent, type ReactNode } from "react";

const EDGE_ZONE = 28; // px from the left edge where the gesture can start
const OPEN_THRESHOLD = 90; // px dragged before releasing counts as "go back"

// Full-screen overlays (product detail, routine editor, compare) own their
// scroll independently of the tab content behind them. position:absolute
// (not fixed) so they stay contained within the app's own window
// (src/app/os/FullScreenApp.tsx) instead of escaping to the real viewport.
//
// They also implement the iOS-style edge-swipe-back gesture here, once,
// instead of each screen wiring its own touch handling: a drag starting
// within EDGE_ZONE of the left edge follows the finger and calls onSwipeBack
// if released past OPEN_THRESHOLD (or flicked with enough velocity).
export function Overlay({
  children,
  onSwipeBack,
}: {
  children: ReactNode;
  onSwipeBack?: () => void;
}) {
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const start = useRef<{ x: number; y: number; t: number; id: number } | null>(null);
  const locked = useRef(false); // once we know it's a vertical scroll, stop tracking

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (!onSwipeBack) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (e.clientX > EDGE_ZONE) return;
    start.current = { x: e.clientX, y: e.clientY, t: Date.now(), id: e.pointerId };
    locked.current = false;
    setDragging(true);
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    if (!start.current || start.current.id !== e.pointerId || locked.current) return;
    const dx = e.clientX - start.current.x;
    const dy = e.clientY - start.current.y;
    if (Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx)) {
      locked.current = true;
      setDragging(false);
      setDragX(0);
      return;
    }
    if (dx > 0) setDragX(dx);
  }

  function onPointerUp(e: PointerEvent<HTMLDivElement>) {
    if (!start.current || start.current.id !== e.pointerId) return;
    const elapsed = Date.now() - start.current.t;
    const velocity = dragX / Math.max(elapsed, 1);
    const shouldClose = dragX > OPEN_THRESHOLD || (dragX > 40 && velocity > 0.5);
    setDragging(false);
    if (shouldClose && onSwipeBack) {
      onSwipeBack();
    } else {
      setDragX(0);
    }
    start.current = null;
  }

  return (
    <div
      className={dragX === 0 ? "anim-appear" : undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 5,
        background: "#EDE7DD",
        overflowY: dragging ? "hidden" : "auto",
        overscrollBehaviorY: "contain",
        WebkitOverflowScrolling: "touch",
        touchAction: onSwipeBack ? "pan-y" : undefined,
        paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)",
        paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 32px)",
        transform: dragX ? `translateX(${dragX}px)` : undefined,
        transition: dragging ? "none" : "transform 220ms cubic-bezier(.2,.7,.2,1)",
        boxShadow: dragX ? "-12px 0 24px rgba(25,23,21,.12)" : undefined,
      }}
    >
      {children}
    </div>
  );
}
