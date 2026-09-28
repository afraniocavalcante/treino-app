"use client";
import { useEffect, useRef, useState } from "react";
import { useStore } from "../store/store";
import { CategoryIcon, DragHandleIcon } from "../components/icons";
import { EmptyState } from "../components/States";
import type { Routine } from "../lib/types";

export function RoutinesScreen({ onEdit }: { onEdit: (routineId: string) => void }) {
  const { data, unarchiveRoutine, reorderRoutines } = useStore();
  const [tab, setTab] = useState<"ativas" | "arquivadas">("ativas");

  const activeRoutines = data.routines
    .filter((r) => r.status === "active")
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const archivedRoutines = data.routines.filter((r) => r.status === "archived");

  const [order, setOrder] = useState<string[]>(activeRoutines.map((r) => r.id));
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resyncs local drag order when the underlying data changes
    setOrder(activeRoutines.map((r) => r.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.routines.map((r) => r.id + r.sortOrder + r.status).join(",")]);

  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const dragStartY = useRef(0);
  const rowRefs = useRef(new Map<string, HTMLDivElement>());

  useEffect(() => {
    if (!dragId) return;
    function clear() {
      setDragId(null);
      setDragOffset(0);
    }
    window.addEventListener("pointerup", clear);
    window.addEventListener("pointercancel", clear);
    return () => {
      window.removeEventListener("pointerup", clear);
      window.removeEventListener("pointercancel", clear);
    };
  }, [dragId]);

  function freqLabel(r: Routine): string {
    if (r.freqMode === "todos") return "todos os dias";
    if (r.freqMode === "intervalo") return `a cada ${r.interval} dias`;
    return "dias específicos";
  }

  function onDragPointerDown(e: React.PointerEvent, routineId: string) {
    e.preventDefault();
    dragStartY.current = e.clientY;
    setDragId(routineId);
    setDragOffset(0);
    (e.target as Element).setPointerCapture(e.pointerId);
  }

  function onDragPointerMove(e: React.PointerEvent) {
    if (!dragId) return;
    setDragOffset(e.clientY - dragStartY.current);

    const idx = order.indexOf(dragId);
    for (let j = 0; j < order.length; j++) {
      if (j === idx) continue;
      const el = rowRefs.current.get(order[j]);
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      const mid = rect.top + rect.height / 2;
      if ((j < idx && e.clientY < mid) || (j > idx && e.clientY > mid)) {
        setOrder((o) => {
          const next = o.slice();
          next.splice(idx, 1);
          next.splice(j, 0, dragId);
          return next;
        });
        break;
      }
    }
  }

  function onDragPointerUp() {
    if (dragId) reorderRoutines(order);
    setDragId(null);
    setDragOffset(0);
  }

  const archivedCount = archivedRoutines.length;

  return (
    <div>
      <div style={{ padding: "34px 0 18px", display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase", color: "#5C5245", fontWeight: 500 }}>
          configuração
        </div>
        <div style={{ fontSize: 25, fontWeight: 300, letterSpacing: "-.01em", color: "#191715" }}>Rotinas</div>
      </div>

      {archivedCount > 0 && (
        <div style={{ position: "relative", display: "flex", gap: 22, padding: "0 0 16px", borderBottom: "1px solid #D3CABB", marginBottom: 16 }}>
          <button
            onClick={() => setTab("ativas")}
            style={{ padding: "0 0 11px", fontSize: 13.5, color: tab === "ativas" ? "#191715" : "#5C5245", fontWeight: tab === "ativas" ? 500 : 300 }}
          >
            ativas
          </button>
          <button
            onClick={() => setTab("arquivadas")}
            style={{ padding: "0 0 11px", fontSize: 13.5, color: tab === "arquivadas" ? "#191715" : "#5C5245", fontWeight: tab === "arquivadas" ? 500 : 300 }}
          >
            arquivadas ({archivedCount})
          </button>
        </div>
      )}

      {tab === "ativas" && activeRoutines.length > 1 && (
        <div style={{ padding: "0 0 12px" }}>
          <span style={{ fontSize: 11, fontWeight: 300, color: "#5C5245" }}>
            Arraste pelo ícone pra decidir a ordem de exibição no Hoje.
          </span>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "0 0" }}>
        {tab === "arquivadas" && archivedRoutines.length === 0 && (
          <EmptyState title="Nenhuma rotina arquivada" body="Rotinas arquivadas somem do Hoje mas ficam guardadas aqui." />
        )}

        {tab === "ativas"
          ? order.map((routineId) => {
              const r = activeRoutines.find((x) => x.id === routineId);
              if (!r) return null;
              const isDragging = dragId === r.id;
              return (
                <div
                  key={r.id}
                  ref={(el) => {
                    if (el) rowRefs.current.set(r.id, el);
                    else rowRefs.current.delete(r.id);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "stretch",
                    gap: 10,
                    background: "#FFFFFF",
                    border: "1px solid #D3CABB",
                    borderRadius: 5,
                    padding: 16,
                    position: "relative",
                    zIndex: isDragging ? 5 : 0,
                    transform: isDragging ? `translateY(${dragOffset}px)` : undefined,
                    boxShadow: isDragging ? "0 6px 16px rgba(25,23,21,.14)" : undefined,
                    touchAction: "none",
                  }}
                >
                  <div
                    onPointerDown={(e) => onDragPointerDown(e, r.id)}
                    onPointerMove={onDragPointerMove}
                    onPointerUp={onDragPointerUp}
                    onPointerCancel={onDragPointerUp}
                    style={{ flex: "none", display: "flex", alignItems: "center", padding: "0 2px", cursor: "grab", touchAction: "none" }}
                  >
                    <DragHandleIcon />
                  </div>
                  <button onClick={() => onEdit(r.id)} style={{ display: "flex", flexDirection: "column", gap: 14, flex: 1, minWidth: 0, textAlign: "left" }}>
                    <RoutineCardHeader r={r} freqLabel={freqLabel} data={data} />
                  </button>
                </div>
              );
            })
          : archivedRoutines.map((r) => (
              <div
                key={r.id}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                  background: "#FFFFFF",
                  border: "1px solid #D3CABB",
                  borderRadius: 5,
                  padding: 16,
                  opacity: 0.7,
                }}
              >
                <button onClick={() => onEdit(r.id)} style={{ display: "flex", flexDirection: "column", gap: 14, width: "100%", textAlign: "left" }}>
                  <RoutineCardHeader r={r} freqLabel={freqLabel} data={data} />
                </button>
                <button
                  onClick={() => unarchiveRoutine(r.id)}
                  style={{ alignSelf: "flex-start", fontSize: 11.5, letterSpacing: ".06em", textTransform: "uppercase", color: "#5C6540", borderBottom: "1px solid #CBD3B7" }}
                >
                  reativar
                </button>
              </div>
            ))}
      </div>
    </div>
  );
}

function RoutineCardHeader({
  r,
  freqLabel,
  data,
}: {
  r: Routine;
  freqLabel: (r: Routine) => string;
  data: ReturnType<typeof useStore>["data"];
}) {
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, width: "100%" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <div style={{ fontSize: 16.5, fontWeight: 400 }}>{r.name}</div>
          <span
            style={{
              alignSelf: "flex-start",
              fontSize: 10,
              letterSpacing: ".1em",
              textTransform: "uppercase",
              color: "#4A423A",
              border: "1px solid #D3CABB",
              borderRadius: 999,
              padding: "3px 9px",
            }}
          >
            {freqLabel(r)}
          </span>
        </div>
        <span style={{ fontSize: 11.5, fontWeight: 300, color: "#5C5245" }}>{r.stepOrder.length} passos</span>
      </div>
      <div style={{ display: "flex", alignItems: "center" }}>
        {r.stepOrder.map((stepId) => {
          const step = data.routineSteps.find((s) => s.id === stepId);
          const product = step ? data.products.find((p) => p.id === step.productId) : undefined;
          return (
            <div
              key={stepId}
              style={{
                width: 34,
                height: 34,
                borderRadius: 999,
                background: "#F0EAE0",
                border: "1px solid #D3CABB",
                marginRight: -8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                flex: "none",
              }}
            >
              {product?.photoUrl ? (
                <img src={product.photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : product ? (
                <CategoryIcon category={product.category} size={14} />
              ) : null}
            </div>
          );
        })}
      </div>
    </>
  );
}
