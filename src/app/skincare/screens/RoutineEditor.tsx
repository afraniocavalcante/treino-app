"use client";
import { useEffect, useRef, useState } from "react";
import { useStore } from "../store/store";
import { ChevronLeft, DragHandleIcon, PlusIcon, CategoryIcon, XIcon } from "../components/icons";
import { Overlay } from "../components/Overlay";
import type { FreqMode } from "../lib/types";

const FREQ_MODES: { id: FreqMode; label: string }[] = [
  { id: "todos", label: "todos os dias" },
  { id: "dias", label: "dias específicos" },
  { id: "intervalo", label: "intervalo" },
];

const DAY_LABELS = ["D", "S", "T", "Q", "Q", "S", "S"];

export function RoutineEditor({ routineId, onClose }: { routineId: string; onClose: () => void }) {
  const { data, saveRoutine, addRoutineStep, deleteRoutineStep, setStepInstruction, deleteRoutine, archiveRoutine } =
    useStore();
  const routine = data.routines.find((r) => r.id === routineId);

  const [name, setName] = useState(routine?.name ?? "");
  const [windowLabel, setWindowLabel] = useState(routine?.window ?? "");
  const [freqMode, setFreqMode] = useState<FreqMode>(routine?.freqMode ?? "todos");
  const [days, setDays] = useState<number[]>(routine?.days ?? []);
  const [interval, setIntervalDays] = useState<number>(routine?.interval ?? 7);
  const [order, setOrder] = useState<string[]>(routine?.stepOrder ?? []);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const dragStartY = useRef(0);
  const rowRefs = useRef(new Map<string, HTMLDivElement>());

  useEffect(() => {
    if (!routine) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resyncs the editor's form fields when routineId changes
    setName(routine.name);
    setWindowLabel(routine.window);
    setFreqMode(routine.freqMode);
    setDays(routine.days);
    setIntervalDays(routine.interval);
    setOrder(routine.stepOrder);
  }, [routineId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Safety net: if the element that captured the pointer is released outside
  // its own handlers (capture lost, gesture interrupted), a window-level
  // listener still clears the drag state so a row never gets stuck floating.
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

  if (!routine) return null;

  function toggleDay(d: number) {
    setDays((ds) => (ds.includes(d) ? ds.filter((x) => x !== d) : [...ds, d].sort()));
  }

  function handleSave() {
    if (!routine) return;
    saveRoutine({ ...routine, name: name.trim() || routine.name, window: windowLabel, freqMode, days, interval, stepOrder: order });
    onClose();
  }

  function addProductStep(productId: string) {
    const stepId = addRoutineStep(routineId, productId);
    setOrder((o) => [...o, stepId]);
    setPickerOpen(false);
  }

  function removeStep(stepId: string) {
    setOrder((o) => o.filter((id) => id !== stepId));
    deleteRoutineStep(stepId);
  }

  function handleDelete() {
    deleteRoutine(routineId);
    onClose();
  }

  function handleArchive() {
    archiveRoutine(routineId);
    onClose();
  }

  function onDragPointerDown(e: React.PointerEvent, stepId: string) {
    e.preventDefault();
    dragStartY.current = e.clientY;
    setDragId(stepId);
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
    setDragId(null);
    setDragOffset(0);
  }

  return (
    <Overlay onSwipeBack={onClose}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "24px 18px 10px" }}>
        <button onClick={onClose} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, fontWeight: 300, color: "#4A423A", padding: 6 }}>
          <ChevronLeft />
          rotinas
        </button>
        <button
          onClick={handleSave}
          style={{ fontSize: 12, letterSpacing: ".06em", textTransform: "uppercase", padding: "8px 16px", borderRadius: 999, background: "#191715", color: "#FFFFFF" }}
        >
          salvar
        </button>
      </div>

      <div style={{ padding: "10px 22px 20px", display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase", color: "#5C5245", fontWeight: 500 }}>editando</div>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="nome da rotina"
          style={{
            fontSize: 25,
            fontWeight: 300,
            letterSpacing: "-.01em",
            color: "#191715",
            border: "none",
            outline: "none",
            background: "transparent",
            padding: 0,
            width: "100%",
            fontFamily: "inherit",
          }}
        />
      </div>

      <div style={{ padding: "0 22px", display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ background: "#FFFFFF", border: "1px solid #D3CABB", borderRadius: 5, padding: 16, display: "flex", flexDirection: "column", gap: 7 }}>
          <span style={{ fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase", color: "#5C5245" }}>turno / rótulo</span>
          <input
            value={windowLabel}
            onChange={(e) => setWindowLabel(e.target.value)}
            placeholder="manhã, noite, semanal..."
            style={{
              border: "1px solid #D3CABB",
              borderRadius: 4,
              background: "#F5F0E8",
              padding: "11px 12px",
              fontSize: 13.5,
              fontWeight: 300,
              color: "#191715",
              outline: "none",
              width: "100%",
              fontFamily: "inherit",
            }}
          />
        </div>
        <div style={{ background: "#FFFFFF", border: "1px solid #D3CABB", borderRadius: 5, padding: 16, display: "flex", flexDirection: "column", gap: 13 }}>
          <span style={{ fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase", color: "#5C5245" }}>frequência</span>
          <div style={{ display: "flex", gap: 7 }}>
            {FREQ_MODES.map((fm) => {
              const active = fm.id === freqMode;
              return (
                <button
                  key={fm.id}
                  onClick={() => setFreqMode(fm.id)}
                  style={{
                    flex: 1,
                    fontSize: 11.5,
                    padding: "9px 4px",
                    borderRadius: 4,
                    border: `1px solid ${active ? "#191715" : "#D3CABB"}`,
                    background: active ? "#191715" : "#FFFFFF",
                    color: active ? "#FFFFFF" : "#4A423A",
                  }}
                >
                  {fm.label}
                </button>
              );
            })}
          </div>
          {freqMode === "dias" && (
            <div style={{ display: "flex", gap: 6 }}>
              {DAY_LABELS.map((label, i) => {
                const active = days.includes(i);
                return (
                  <button
                    key={i}
                    onClick={() => toggleDay(i)}
                    style={{
                      flex: 1,
                      aspectRatio: "1",
                      borderRadius: 999,
                      fontSize: 11,
                      border: `1px solid ${active ? "#5C6540" : "#D3CABB"}`,
                      background: active ? "#5C6540" : "#FFFFFF",
                      color: active ? "#FFFFFF" : "#4A423A",
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          )}
          {freqMode === "intervalo" && (
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 300, color: "#4A423A" }}>a cada</span>
              <button
                onClick={() => setIntervalDays((v) => Math.max(1, v - 1))}
                style={{ width: 32, height: 32, borderRadius: 999, border: "1px solid #D3CABB", color: "#4A423A" }}
              >
                −
              </button>
              <span style={{ fontSize: 15, minWidth: 22, textAlign: "center" }}>{interval}</span>
              <button
                onClick={() => setIntervalDays((v) => v + 1)}
                style={{ width: 32, height: 32, borderRadius: 999, border: "1px solid #D3CABB", color: "#4A423A" }}
              >
                +
              </button>
              <span style={{ fontSize: 13, fontWeight: 300, color: "#4A423A" }}>dias</span>
            </div>
          )}
        </div>

        <div style={{ background: "#FFFFFF", border: "1px solid #D3CABB", borderRadius: 5, overflow: "hidden" }}>
          <div style={{ padding: "15px 16px 12px", fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase", color: "#5C5245" }}>
            passos
          </div>
          {order.map((stepId) => {
            const step = data.routineSteps.find((s) => s.id === stepId);
            const product = step ? data.products.find((p) => p.id === step.productId) : undefined;
            if (!step || !product) return null;
            const isDragging = dragId === stepId;
            return (
              <div
                key={stepId}
                ref={(el) => {
                  if (el) rowRefs.current.set(stepId, el);
                  else rowRefs.current.delete(stepId);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 16px",
                  borderTop: "1px solid #E6DFD3",
                  background: isDragging ? "#F5F0E8" : "#FFFFFF",
                  position: "relative",
                  zIndex: isDragging ? 5 : 0,
                  transform: isDragging ? `translateY(${dragOffset}px)` : undefined,
                  boxShadow: isDragging ? "0 6px 16px rgba(25,23,21,.14)" : undefined,
                  touchAction: "none",
                }}
              >
                <div
                  onPointerDown={(e) => onDragPointerDown(e, stepId)}
                  onPointerMove={onDragPointerMove}
                  onPointerUp={onDragPointerUp}
                  onPointerCancel={onDragPointerUp}
                  style={{ flex: "none", padding: 4, cursor: "grab", touchAction: "none" }}
                >
                  <DragHandleIcon />
                </div>
                <div
                  style={{
                    width: 38,
                    height: 38,
                    flex: "none",
                    borderRadius: 999,
                    background: "#F0EAE0",
                    border: "1px solid #D3CABB",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                  }}
                >
                  {product.photoUrl ? (
                    <img src={product.photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <CategoryIcon category={product.category} />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 400, lineHeight: 1.25 }}>{product.name}</div>
                  <input
                    value={step.instruction}
                    onChange={(e) => setStepInstruction(step.id, e.target.value)}
                    placeholder="instrução (opcional)"
                    style={{
                      fontSize: 11,
                      fontWeight: 300,
                      color: step.instruction ? "#8E3D1E" : "#5C5245",
                      border: "none",
                      outline: "none",
                      background: "transparent",
                      padding: 0,
                      width: "100%",
                      fontFamily: "inherit",
                    }}
                  />
                </div>
                <button
                  onClick={() => removeStep(stepId)}
                  style={{ width: 26, height: 26, flex: "none", display: "flex", alignItems: "center", justifyContent: "center" }}
                  aria-label="remover passo"
                >
                  <XIcon />
                </button>
              </div>
            );
          })}
          <button
            onClick={() => setPickerOpen(true)}
            style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left", padding: "14px 16px", borderTop: "1px solid #E6DFD3", color: "#4A423A" }}
          >
            <PlusIcon />
            <span style={{ fontSize: 13, fontWeight: 300 }}>Vincular produto</span>
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 6 }}>
          {confirmDelete ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, background: "#F7E7DE", border: "1px solid #E0BCA9", borderRadius: 5, padding: 16 }}>
              <span style={{ fontSize: 13, fontWeight: 300, color: "#8E3D1E" }}>
                Excluir &quot;{routine.name}&quot; e todos os seus passos? Essa ação não pode ser desfeita.
              </span>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={() => setConfirmDelete(false)}
                  style={{ flex: 1, padding: 11, borderRadius: 999, border: "1px solid #D3CABB", fontSize: 12, letterSpacing: ".06em", textTransform: "uppercase", color: "#4A423A" }}
                >
                  cancelar
                </button>
                <button
                  onClick={handleDelete}
                  style={{ flex: 1, padding: 11, borderRadius: 999, background: "#8E3D1E", color: "#FFFFFF", fontSize: 12, letterSpacing: ".06em", textTransform: "uppercase" }}
                >
                  excluir
                </button>
              </div>
            </div>
          ) : (
            <>
              <button
                onClick={handleArchive}
                style={{ width: "100%", padding: 12, borderRadius: 999, border: "1px solid #D3CABB", color: "#4A423A", fontSize: 12, letterSpacing: ".06em", textTransform: "uppercase" }}
              >
                arquivar rotina
              </button>
              <button
                onClick={() => setConfirmDelete(true)}
                style={{ width: "100%", padding: 12, borderRadius: 999, border: "1px solid #E0BCA9", color: "#8E3D1E", fontSize: 12, letterSpacing: ".06em", textTransform: "uppercase" }}
              >
                excluir rotina
              </button>
            </>
          )}
        </div>
      </div>

      {pickerOpen && (
        <div
          className="anim-veil-in"
          onClick={() => setPickerOpen(false)}
          style={{ position: "absolute", inset: 0, zIndex: 6, display: "flex", justifyContent: "center", alignItems: "flex-end", background: "rgba(25,23,21,.32)" }}
        >
          <div
            className="anim-sheet-up"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: "100%",
              background: "#FFFFFF",
              borderRadius: "8px 8px 0 0",
              padding: "10px 0 26px",
              maxHeight: "70vh",
              overflowY: "auto",
              overscrollBehaviorY: "contain",
              WebkitOverflowScrolling: "touch",
            }}
          >
            <div style={{ display: "flex", justifyContent: "center", padding: "6px 0 14px" }}>
              <span style={{ width: 38, height: 3, borderRadius: 999, background: "#D3CABB" }} />
            </div>
            <div style={{ padding: "0 20px 14px", fontSize: 18, fontWeight: 400 }}>Vincular produto</div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {data.products
                .filter((p) => p.status === "active")
                .map((p) => (
                  <button
                    key={p.id}
                    onClick={() => addProductStep(p.id)}
                    style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 20px", borderTop: "1px solid #E6DFD3", textAlign: "left" }}
                  >
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        flex: "none",
                        borderRadius: 999,
                        background: "#F0EAE0",
                        border: "1px solid #D3CABB",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        overflow: "hidden",
                      }}
                    >
                      {p.photoUrl ? (
                        <img src={p.photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <CategoryIcon category={p.category} />
                      )}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 400 }}>{p.name}</div>
                      <div style={{ fontSize: 11.5, fontWeight: 300, color: "#5C5245" }}>{p.brand}</div>
                    </div>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}
    </Overlay>
  );
}
