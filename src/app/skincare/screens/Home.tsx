"use client";

import { useMemo, useState } from "react";
import { useStore } from "../store/store";
import {
  computeStreak,
  isRoutineDueOn,
  lastSkinLogDaysAgo,
  stepsDoneCount,
  weekHasSkinLog,
} from "../lib/derived";
import { addDays, daysInMonth, formatDateLong, monthLabel, todayISO } from "../lib/dates";
import { Ring, Flip } from "../components/Ring";
import { CategoryIcon, CheckIcon, NoteLinesIcon, HexIcon, ChevronLeft } from "../components/icons";
import type { Product } from "../lib/types";

const NOTE_TAGS = ["acne", "textura", "manchas", "glow"];

export function Home({ onOpenLogSheet }: { onOpenLogSheet: () => void }) {
  const { data, toggleStep, setNote, toggleNoteTag } = useStore();
  const today = todayISO();
  const [viewDate, setViewDate] = useState(today);
  const isToday = viewDate === today;
  const [noteOpen, setNoteOpen] = useState(false);
  const [pulse, setPulse] = useState<Record<string, boolean>>({});

  const productById = useMemo(() => {
    const m = new Map<string, Product>();
    for (const p of data.products) m.set(p.id, p);
    return m;
  }, [data.products]);

  const stepById = useMemo(() => {
    const m = new Map<string, (typeof data.routineSteps)[number]>();
    for (const s of data.routineSteps) m.set(s.id, s);
    return m;
  }, [data.routineSteps]);

  const streak = computeStreak(data);
  const checkin = data.checkins.find((c) => c.date === today);
  const note = checkin?.note ?? "";
  const tags = checkin?.tags ?? [];

  const routinesToday = data.routines
    .filter((r) => r.status === "active" && r.stepOrder.length > 0 && isRoutineDueOn(r, viewDate))
    .slice()
    .sort((a, b) => {
      const aDone = stepsDoneCount(data, a, viewDate);
      const bDone = stepsDoneCount(data, b, viewDate);
      const aComplete = aDone.total > 0 && aDone.done === aDone.total;
      const bComplete = bDone.total > 0 && bDone.done === bDone.total;
      return Number(aComplete) - Number(bComplete);
    });
  const dayComplete =
    routinesToday.length > 0 &&
    routinesToday.every((r) => {
      const { done, total } = stepsDoneCount(data, r, viewDate);
      return total > 0 && done === total;
    });

  const daysAgo = lastSkinLogDaysAgo(data);
  const logDue = !weekHasSkinLog(data);

  function handleToggle(routineId: string, stepId: string) {
    toggleStep(viewDate, stepId);
    const routine = data.routines.find((r) => r.id === routineId);
    if (!routine) return;
    const willBeDone = !data.checkinItems.find(
      (ci) => ci.date === viewDate && ci.stepId === stepId,
    )?.done;
    const doneNow = routine.stepOrder.filter((sid) =>
      sid === stepId
        ? willBeDone
        : data.checkinItems.some(
            (ci) => ci.date === viewDate && ci.stepId === sid && ci.done,
          ),
    ).length;
    if (doneNow === routine.stepOrder.length) {
      setPulse((p) => ({ ...p, [routineId]: true }));
      setTimeout(() => setPulse((p) => ({ ...p, [routineId]: false })), 700);
    }
  }

  const month = daysInMonth(today).map((iso) => {
    const has = data.checkinItems.some((ci) => ci.date === iso && ci.done);
    const isRealToday = iso === today;
    const isViewed = iso === viewDate && !isToday;
    return {
      iso,
      bg: isRealToday ? "#5C6540" : has ? "#B9AE99" : "transparent",
      border: isViewed ? "#5C6540" : has || isRealToday ? "transparent" : "#D3CABB",
    };
  });

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 16,
          padding: "0 0 22px",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingTop: 2 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              onClick={() => setViewDate((d) => addDays(d, -1))}
              aria-label="dia anterior"
              style={{ padding: 4, flex: "none", opacity: 0.8 }}
            >
              <ChevronLeft />
            </button>
            <div style={{ fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase", color: "#5C5245", fontWeight: 500 }}>
              {isToday ? "hoje" : "editando"}
            </div>
            <button
              onClick={() => !isToday && setViewDate((d) => addDays(d, 1))}
              aria-label="próximo dia"
              disabled={isToday}
              style={{ padding: 4, flex: "none", opacity: isToday ? 0.25 : 0.8, transform: "scaleX(-1)" }}
            >
              <ChevronLeft />
            </button>
          </div>
          <div style={{ fontSize: 25, fontWeight: 300, letterSpacing: "-.01em", lineHeight: 1.15, color: "#191715" }}>
            {formatDateLong(viewDate)}
          </div>
          {!isToday && (
            <button
              onClick={() => setViewDate(today)}
              style={{ alignSelf: "flex-start", fontSize: 11, fontWeight: 300, color: "#5C6540", borderBottom: "1px solid #CBD3B7" }}
            >
              voltar pra hoje
            </button>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
          <Ring size={46} r={20} stroke={1.5} fraction={Math.min(streak / 30, 1)} color="#5C6540" trackColor="#D9D1C3">
            <div style={{ fontSize: 15, fontWeight: 400, color: "#191715" }}>
              <Flip value={streak} />
            </div>
          </Ring>
          <div style={{ fontSize: 9, letterSpacing: ".14em", textTransform: "uppercase", color: "#5C5245" }}>dias</div>
        </div>
      </div>

      {dayComplete && (
        <div
          className="anim-appear"
          style={{
            margin: "0 0 20px",
            padding: "16px 18px",
            background: "#E7EBDD",
            border: "1px solid #CBD3B7",
            borderRadius: 4,
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <HexIcon />
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: "#39441F" }}>Dia completo</div>
            <div style={{ fontSize: 12.5, fontWeight: 300, color: "#4F5A38" }}>
              {isToday ? "Todas as rotinas de hoje fechadas." : "Todas as rotinas desse dia fechadas."}
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {routinesToday.map((r) => {
          const { done, total } = stepsDoneCount(data, r, viewDate);
          const complete = total > 0 && done === total;
          const ringColor = complete ? "#4F6440" : "#A79A8C";
          return (
            <section
              key={r.id}
              style={{ background: "#FFFFFF", border: "1px solid #D3CABB", borderRadius: 5, overflow: "hidden" }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, padding: "18px 18px 14px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <div style={{ fontSize: 17, fontWeight: 400, letterSpacing: "-.005em" }}>{r.name}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <span
                      style={{
                        fontSize: 10,
                        letterSpacing: ".12em",
                        textTransform: "uppercase",
                        color: "#4A423A",
                        border: "1px solid #D3CABB",
                        borderRadius: 999,
                        padding: "3px 9px",
                      }}
                    >
                      {r.window}
                    </span>
                    <span style={{ fontSize: 11.5, fontWeight: 300, color: "#5C5245" }}>
                      {complete ? "completa" : `${done} de ${total} passos`}
                    </span>
                  </div>
                </div>
                <div className={pulse[r.id] ? "anim-pulse" : undefined}>
                  <Ring size={44} r={19} stroke={2} fraction={total ? done / total : 0} color={ringColor} trackColor="#DED6C9">
                    <div style={{ fontSize: 11, fontWeight: 400, color: "#4A423A", letterSpacing: "-.02em" }}>
                      {complete ? "✓" : <Flip value={`${done}/${total}`} />}
                    </div>
                  </Ring>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column" }}>
                {r.stepOrder.map((stepId) => {
                  const step = stepById.get(stepId);
                  const product = step ? productById.get(step.productId) : undefined;
                  if (!step || !product) return null;
                  const checkOn = data.checkinItems.some(
                    (ci) => ci.date === viewDate && ci.stepId === stepId && ci.done,
                  );
                  return (
                    <button
                      key={stepId}
                      onClick={() => handleToggle(r.id, stepId)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 14,
                        width: "100%",
                        textAlign: "left",
                        padding: "12px 18px",
                        borderTop: "1px solid #E6DFD3",
                        background: "#FFFFFF",
                      }}
                    >
                      <div style={{ position: "relative", width: 44, height: 44, flex: "none" }}>
                        <svg width="44" height="44" viewBox="0 0 44 44" style={{ position: "absolute", inset: 0, display: "block" }}>
                          <circle cx="22" cy="22" r="21" fill={checkOn ? "#E7EBDD" : "#F0EAE0"} stroke="#D3CABB" strokeWidth="1" />
                        </svg>
                        {product.photoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={product.photoUrl}
                            alt=""
                            style={{ position: "absolute", top: 3, left: 3, width: 38, height: 38, borderRadius: 999, objectFit: "cover" }}
                          />
                        ) : (
                          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.75 }}>
                            <CategoryIcon category={product.category} />
                          </div>
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
                        <div
                          style={{
                            fontSize: 14.5,
                            fontWeight: 400,
                            color: checkOn ? "#4A423A" : "#191715",
                            lineHeight: 1.25,
                            transition: "color 240ms ease 200ms",
                          }}
                        >
                          {product.name}
                        </div>
                        <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 11.5, fontWeight: 300, color: "#5C5245", letterSpacing: ".02em" }}>
                            {product.brand}
                          </span>
                          {step.instruction && (
                            <span style={{ fontSize: 11, fontWeight: 300, color: "#8E3D1E", letterSpacing: ".01em" }}>
                              {step.instruction}
                            </span>
                          )}
                        </div>
                      </div>
                      <div style={{ width: 22, height: 22, flex: "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <CheckIcon
                          fill={checkOn ? "#4F6440" : "#F0EAE0"}
                          strokeColor={checkOn ? "#4F6440" : "#BDB2A1"}
                          showTick={checkOn}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      {logDue && (
        <div style={{ padding: "16px 0 0" }}>
          <div
            className="anim-appear"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              background: "#FFFFFF",
              border: "1px solid #D3CABB",
              borderRadius: 5,
              padding: "15px 16px",
            }}
          >
            <div
              className="photo-stripe"
              style={{ width: 44, height: 44, flex: "none", borderRadius: 3, border: "1px dashed #BDB2A1" }}
            />
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
              <div style={{ fontSize: 13.5, fontWeight: 400 }}>Registro da semana</div>
              <div style={{ fontSize: 11.5, fontWeight: 300, color: "#5C5245", lineHeight: 1.45 }}>
                {daysAgo == null ? "Nenhum registro ainda" : `Última foto há ${daysAgo} dias`} · a cada 7 dias
              </div>
            </div>
            <button
              onClick={onOpenLogSheet}
              style={{
                flex: "none",
                fontSize: 11.5,
                letterSpacing: ".06em",
                textTransform: "uppercase",
                padding: "9px 14px",
                borderRadius: 999,
                background: "#191715",
                color: "#FFFFFF",
              }}
            >
              registrar
            </button>
          </div>
        </div>
      )}

      <div style={{ padding: "16px 0 0" }}>
        <div style={{ background: "#FFFFFF", border: "1px solid #D3CABB", borderRadius: 5 }}>
          <button
            onClick={() => setNoteOpen((v) => !v)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              width: "100%",
              padding: "15px 18px",
              textAlign: "left",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <NoteLinesIcon />
              <span style={{ fontSize: 13.5, fontWeight: 400, color: "#4A423A" }}>
                {note ? "Nota do dia · salva" : "Nota rápida do dia"}
              </span>
            </span>
            <span
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 14,
                height: 14,
                transform: `rotate(${noteOpen ? 45 : 0}deg)`,
                transition: "transform 300ms cubic-bezier(.2,.7,.2,1)",
              }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12">
                <line x1="6" y1="1" x2="6" y2="11" stroke="#5C5245" strokeWidth="1.1" />
                <line x1="1" y1="6" x2="11" y2="6" stroke="#5C5245" strokeWidth="1.1" />
              </svg>
            </span>
          </button>
          <div
            style={{
              overflow: "hidden",
              maxHeight: noteOpen ? 220 : 0,
              opacity: noteOpen ? 1 : 0,
              transition: `max-height 340ms cubic-bezier(.2,.7,.2,1), opacity 260ms ease ${noteOpen ? "80ms" : "0ms"}`,
            }}
          >
            <div style={{ padding: "0 18px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
              <textarea
                value={note}
                onChange={(e) => setNote(today, e.target.value)}
                placeholder="Pele mais calma hoje, sem descamação."
                style={{
                  width: "100%",
                  minHeight: 74,
                  resize: "none",
                  background: "#F5F0E8",
                  border: "1px solid #D3CABB",
                  borderRadius: 4,
                  padding: "11px 12px",
                  fontSize: 13.5,
                  fontWeight: 300,
                  lineHeight: 1.5,
                  outline: "none",
                }}
              />
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                {NOTE_TAGS.map((tag) => {
                  const active = tags.includes(tag);
                  return (
                    <button
                      key={tag}
                      onClick={() => toggleNoteTag(today, tag)}
                      style={{
                        fontSize: 11,
                        letterSpacing: ".06em",
                        padding: "5px 11px",
                        borderRadius: 999,
                        border: `1px solid ${active ? "#B9AE99" : "#D3CABB"}`,
                        background: active ? "#E2DDCB" : "#FFFFFF",
                        color: active ? "#191715" : "#4A423A",
                      }}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: "26px 0 8px", display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ fontSize: 10, letterSpacing: ".16em", textTransform: "uppercase", color: "#5C5245", fontWeight: 500 }}>
          {monthLabel(today)}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(15, 1fr)", gap: 5 }}>
          {month.map((d) => (
            <button
              key={d.iso}
              onClick={() => d.iso <= today && setViewDate(d.iso)}
              disabled={d.iso > today}
              aria-label={d.iso}
              style={{
                aspectRatio: "1",
                borderRadius: 2,
                background: d.bg,
                border: `1px solid ${d.border}`,
                cursor: d.iso > today ? "default" : "pointer",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
