"use client";

import { useRef, useState, type PointerEvent, type ReactNode } from "react";

export interface SwipeAction {
  label: string;
  background: string;
  color: string;
  onClick: () => void;
}

const ACTION_WIDTH = 84;

// WhatsApp-style swipe-to-reveal: drag the row left to expose one or more
// action buttons docked to its right edge; release past the halfway point
// to snap open, tap a revealed action to run it. Only one row is open at a
// time across a list — the parent owns `openId`/`onOpenChange` so opening
// a new row closes whichever was open before.
export function SwipeableRow({
  id,
  openId,
  onOpenChange,
  actions,
  children,
}: {
  id: string;
  openId: string | null;
  onOpenChange: (id: string | null) => void;
  actions: SwipeAction[];
  children: ReactNode;
}) {
  const maxReveal = actions.length * ACTION_WIDTH;
  const isOpen = openId === id;

  const [dragX, setDragX] = useState<number | null>(null); // non-null only while actively dragging
  const start = useRef({ x: 0, y: 0, baseX: 0 });
  const pointerId = useRef<number | null>(null);
  const moved = useRef(false);
  const verticalLock = useRef(false);
  const suppressClick = useRef(false);

  const currentX = dragX !== null ? dragX : isOpen ? -maxReveal : 0;

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    pointerId.current = e.pointerId;
    moved.current = false;
    verticalLock.current = false;
    start.current = { x: e.clientX, y: e.clientY, baseX: isOpen ? -maxReveal : 0 };
    setDragX(start.current.baseX);
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    if (pointerId.current !== e.pointerId) return;
    const dx = e.clientX - start.current.x;
    const dy = e.clientY - start.current.y;
    if (!moved.current && Math.abs(dx) < 4 && Math.abs(dy) < 4) return;
    moved.current = true;
    if (!verticalLock.current && Math.abs(dy) > Math.abs(dx) + 4) {
      verticalLock.current = true;
    }
    if (verticalLock.current) return;
    const next = Math.min(0, Math.max(-maxReveal, start.current.baseX + dx));
    setDragX(next);
    if (openId !== id && next < -4) onOpenChange(id);
  }

  function onPointerUp(e: PointerEvent<HTMLDivElement>) {
    if (pointerId.current !== e.pointerId) return;
    pointerId.current = null;

    if (verticalLock.current) {
      setDragX(null);
      return;
    }
    if (!moved.current) {
      if (isOpen) {
        onOpenChange(null);
        suppressClick.current = true;
      }
      setDragX(null);
      return;
    }
    const shouldOpen = (dragX ?? 0) < -maxReveal / 2;
    onOpenChange(shouldOpen ? id : null);
    suppressClick.current = true;
    setDragX(null);
  }

  return (
    <div style={{ position: "relative", overflow: "hidden", borderRadius: 5 }}>
      <div style={{ position: "absolute", inset: 0, display: "flex", justifyContent: "flex-end" }}>
        {actions.map((a) => (
          <button
            key={a.label}
            onClick={() => {
              a.onClick();
              onOpenChange(null);
            }}
            style={{
              width: ACTION_WIDTH,
              flex: "none",
              background: a.background,
              color: a.color,
              fontSize: 11,
              letterSpacing: ".06em",
              textTransform: "uppercase",
            }}
          >
            {a.label}
          </button>
        ))}
      </div>
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClickCapture={(e) => {
          if (suppressClick.current) {
            suppressClick.current = false;
            e.preventDefault();
            e.stopPropagation();
          }
        }}
        style={{
          position: "relative",
          zIndex: 1,
          transform: `translateX(${currentX}px)`,
          transition: dragX !== null ? "none" : "transform 220ms cubic-bezier(.2,.7,.2,1)",
          touchAction: "pan-y",
        }}
      >
        {children}
      </div>
    </div>
  );
}
