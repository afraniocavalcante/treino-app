"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getAllFlights, getTripDetail, getTrips, toggleChecklistItem, updateFlight } from "@/lib/travelData";
import {
  deriveFlightState,
  MOMENT_LABELS,
  PHASE_LABELS,
  tripDaysAway,
  type ChecklistItem,
  type ChecklistMoment,
  type Flight,
  type Trip,
} from "@/lib/travel";
import "./broadsheet.css";
import TripEditor from "./TripEditor";

type Sheet = "checklist" | "checkin" | "boardingpass" | null;
type Stamp = "checkin" | "arrival" | null;

const PHOSPHOR_CSS = "https://unpkg.com/@phosphor-icons/web@2.1.1/src/duotone/style.css";

export default function TravelApp() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [copied, setCopied] = useState(false);
  const [stamp, setStamp] = useState<Stamp>(null);
  const [now, setNow] = useState(() => new Date());
  const [editing, setEditing] = useState<{ mode: "new" } | { mode: "edit"; tripId: string } | null>(null);
  const [saving, setSaving] = useState(false);

  async function refresh() {
    const [t, f] = await Promise.all([getTrips(supabase), getAllFlights(supabase)]);
    setTrips(t);
    setFlights(f);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await refresh();
      } catch (err) {
        console.error("Falha ao carregar viagens:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const activeFlight = useMemo(() => {
    const withState = flights.map((f) => ({ f, s: deriveFlightState(f, now) })).filter((x) => x.s.active);
    withState.sort((a, b) => new Date(a.f.departureAt).getTime() - new Date(b.f.departureAt).getTime());
    return withState[0] ?? null;
  }, [flights, now]);

  const activeTrip = activeFlight ? trips.find((t) => t.id === activeFlight.f.tripId) ?? null : null;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!activeTrip) {
        if (!cancelled) setChecklist([]);
        return;
      }
      try {
        const detail = await getTripDetail(supabase, activeTrip.id);
        if (!cancelled && detail) setChecklist(detail.checklist);
      } catch (err) {
        console.error("Falha ao carregar checklist:", err);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTrip?.id]);

  const otherTrips = trips.filter((t) => t.id !== activeTrip?.id && new Date(t.endDate) >= now);

  if (loading) {
    return (
      <div className="bs" style={{ minHeight: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-neutral-700)" }}>
        <link rel="stylesheet" href={PHOSPHOR_CSS} />
        Carregando…
      </div>
    );
  }

  if (editing) {
    return (
      <div className="bs" style={{ minHeight: "100%" }}>
        <link rel="stylesheet" href={PHOSPHOR_CSS} />
        <TripEditor
          tripId={editing.mode === "edit" ? editing.tripId : null}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refresh().catch((err) => console.error("Falha ao recarregar viagens:", err));
          }}
        />
      </div>
    );
  }

  const state = activeFlight ? deriveFlightState(activeFlight.f, now) : null;
  const f = activeFlight?.f ?? null;

  function copyPnr() {
    if (!f?.pnr) return;
    navigator.clipboard?.writeText(f.pnr).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1300);
  }

  async function handlePrimary() {
    if (!state?.primary || !f) return;
    if (state.primary.action === "checklist") setSheet("checklist");
    else if (state.primary.action === "checkin") {
      copyPnr();
      setSheet("checkin");
    } else if (state.primary.action === "boardingpass") setSheet("boardingpass");
    else if (state.primary.action === "viewtrip" && activeTrip) setEditing({ mode: "edit", tripId: activeTrip.id });
  }

  async function confirmCheckin() {
    if (!f) return;
    setSaving(true);
    try {
      await updateFlight(supabase, f.id, { checkinDone: true });
      setFlights((prev) => prev.map((x) => (x.id === f.id ? { ...x, checkinDone: true } : x)));
      setSheet(null);
      setStamp("checkin");
      setTimeout(() => setStamp(null), 4000);
    } catch (err) {
      console.error("Falha ao confirmar check-in:", err);
    } finally {
      setSaving(false);
    }
  }

  async function toggleItem(item: ChecklistItem) {
    const nextDone = !item.done;
    setChecklist((prev) => prev.map((x) => (x.id === item.id ? { ...x, done: nextDone } : x)));
    try {
      await toggleChecklistItem(supabase, item.id, nextDone);
    } catch (err) {
      console.error("Falha ao atualizar checklist:", err);
      setChecklist((prev) => prev.map((x) => (x.id === item.id ? { ...x, done: item.done } : x)));
    }
  }

  const doneCount = checklist.filter((c) => c.done).length;
  const totalCount = checklist.length;
  const ringOffset = totalCount > 0 ? 150.8 * (1 - doneCount / totalCount) : 150.8;
  const nextItem = checklist.find((c) => !c.done);

  return (
    <div className="bs" style={{ minHeight: "100%", padding: "12px 20px 40px", display: "flex", flexDirection: "column", gap: 22 }}>
      <link rel="stylesheet" href={PHOSPHOR_CSS} />

      {!activeFlight && (
        <div style={{ display: "flex", flexDirection: "column", gap: 18, paddingTop: 20 }}>
          <h1>Viagens</h1>
          <p style={{ color: "var(--color-neutral-700)" }}>Nenhuma viagem cadastrada ainda.</p>
          <button className="btn btn-primary btn-block" onClick={() => setEditing({ mode: "new" })} style={{ minHeight: 52, fontSize: 16 }}>
            <i className="ph-duotone ph-plus" />Nova viagem
          </button>
        </div>
      )}

      {activeFlight && state && f && activeTrip && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>
              {activeTrip.city} <span style={{ fontWeight: 400, fontStyle: "italic", color: "var(--color-neutral-700)" }}>{tripDaysAway(activeTrip, now)}d</span>
            </span>
            <span className={`tag tag-${state.statusVariant}`}>{state.status}</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <h1 style={{ textWrap: "pretty" as const }}>{state.headline}</h1>
            {state.sub && <p style={{ margin: 0, color: "var(--color-neutral-700)" }}>{state.sub}</p>}
          </div>

          <div className="card elev-md" style={{ position: "relative", padding: 0, gap: 0, background: "var(--color-neutral-100)" }}>
            <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, color: "var(--color-neutral-700)" }}>
                <span>{f.carrier} · {f.flightNumber}</span>
                {f.pnr && (
                  <button
                    onClick={copyPnr}
                    style={{ position: "relative", display: "flex", alignItems: "center", gap: 6, border: 0, background: "transparent", font: "inherit", fontSize: 13, color: "var(--color-neutral-700)", cursor: "pointer", padding: 0 }}
                  >
                    Localizador <b style={{ color: "var(--color-text)", letterSpacing: ".08em", fontSize: 15 }}>{f.pnr}</b>
                    <i className="ph-duotone ph-copy" style={{ fontSize: 16, color: "var(--color-accent)" }} />
                    {copied && (
                      <span style={{ position: "absolute", left: "50%", bottom: "100%", padding: "4px 10px", borderRadius: "var(--radius-md)", background: "var(--color-text)", color: "var(--color-bg)", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", pointerEvents: "none", animation: "bsBalloon 1.3s ease both" }}>
                        Copiado
                      </span>
                    )}
                  </button>
                )}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", alignItems: "center", gap: 12 }}>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontSize: 40, fontWeight: 600, lineHeight: 1, letterSpacing: "-.02em" }}>{f.originIata}</span>
                  <span style={{ fontSize: 13, color: "var(--color-neutral-700)" }}>{f.originCity}{f.originTerminal ? ` · T${f.originTerminal}` : ""}</span>
                </div>
                <div style={{ position: "relative", height: 24 }}>
                  <div style={{ position: "absolute", left: 0, right: 0, top: 12, borderTop: "2px dotted var(--color-neutral-400)" }} />
                  <div style={{ position: "absolute", left: 0, top: 12, height: 2, width: `${state.routePct}%`, background: "var(--color-accent)", transition: "width 600ms ease" }} />
                  <i className="ph-duotone ph-airplane" style={{ position: "absolute", top: 0, left: `${state.routePct}%`, marginLeft: -12, fontSize: 24, color: "var(--color-accent)", transform: "rotate(90deg)", transition: "left 600ms ease" }} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                  <span style={{ fontSize: 40, fontWeight: 600, lineHeight: 1, letterSpacing: "-.02em" }}>{f.destIata}</span>
                  <span style={{ fontSize: 13, color: "var(--color-neutral-700)" }}>{f.destCity}{f.destTerminal ? ` · T${f.destTerminal}` : ""}</span>
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15 }}>
                <span><b>{new Date(f.departureAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</b> · {new Date(f.departureAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}</span>
                <span><b>{new Date(f.arrivalAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</b> · {new Date(f.arrivalAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}</span>
              </div>
            </div>
            <div style={{ position: "relative", height: 0, borderTop: "2px dashed var(--color-neutral-300)", margin: "0 16px" }}>
              <div style={{ position: "absolute", left: -28, top: -13, width: 24, height: 24, borderRadius: "50%", background: "var(--color-bg)" }} />
              <div style={{ position: "absolute", right: -28, top: -13, width: 24, height: 24, borderRadius: "50%", background: "var(--color-bg)" }} />
            </div>
            <div style={{ padding: "18px 20px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase" as const, color: "var(--color-accent-700)" }}>
                {state.pulse && (
                  <span style={{ position: "relative", width: 8, height: 8, display: "inline-block" }}>
                    <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "var(--color-accent)" }} />
                    <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "var(--color-accent)", animation: "bsPulse 1.4s ease-out infinite" }} />
                  </span>
                )}
                <span>{state.kicker}</span>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" as const }}>
                <span key={state.big} style={{ display: "inline-block", fontSize: 48, fontWeight: 600, lineHeight: 0.95, letterSpacing: "-.02em", fontVariantNumeric: "tabular-nums", animation: "bsFlip 450ms cubic-bezier(.2,.8,.3,1) both" }}>{state.big}</span>
                {state.unit && <span style={{ fontSize: 16, fontStyle: "italic" as const }}>{state.unit}</span>}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
                {state.facts.slice(0, 3).map((fact) => (
                  <div key={fact.k} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <span style={{ fontSize: 10, letterSpacing: ".08em", textTransform: "uppercase" as const, color: "var(--color-neutral-700)" }}>{fact.k}</span>
                    <span style={{ fontSize: 16, fontWeight: 600 }}>{fact.v}</span>
                  </div>
                ))}
              </div>
              {state.primary && (
                <button className="btn btn-primary btn-block" onClick={handlePrimary} style={{ minHeight: 48, fontSize: 15, marginTop: 4, justifyContent: "space-between", paddingInline: 16 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>{state.primary.label}</span>
                  <i className="ph-duotone ph-arrow-right" />
                </button>
              )}
            </div>
          </div>

          {stamp && (
            <div
              onClick={() => setStamp(null)}
              style={{ alignSelf: "flex-start", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "8px 14px", border: "3px double var(--color-accent-2)", borderRadius: "var(--radius-lg)", color: "var(--color-accent-2-700)", cursor: "pointer", animation: "bsStamp 600ms cubic-bezier(.2,.8,.3,1) both" }}
            >
              <span style={{ fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase" as const }}>{f.carrier} · {f.flightNumber}</span>
              <span style={{ fontSize: 20, fontWeight: 600, letterSpacing: ".06em" }}>CHECK-IN OK</span>
            </div>
          )}

          <button
            onClick={() => setSheet("checklist")}
            style={{ display: "flex", alignItems: "center", gap: 16, border: 0, background: "transparent", font: "inherit", color: "inherit", textAlign: "left" as const, cursor: "pointer", padding: 0 }}
          >
            <svg width={56} height={56} viewBox="0 0 56 56" style={{ flexShrink: 0 }}>
              <circle cx={28} cy={28} r={24} fill="none" stroke="var(--color-neutral-300)" strokeWidth={5} />
              <circle cx={28} cy={28} r={24} fill="none" stroke="var(--color-accent)" strokeWidth={5} strokeLinecap="round" strokeDasharray={150.8} strokeDashoffset={ringOffset} transform="rotate(-90 28 28)" style={{ transition: "stroke-dashoffset 400ms ease" }} />
            </svg>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ fontSize: 16, fontWeight: 600 }}>{totalCount > 0 && doneCount === totalCount ? "Pronto para decolar" : `${doneCount} de ${totalCount} itens`}</span>
              <span style={{ fontSize: 13, color: "var(--color-neutral-700)" }}>{nextItem ? `Próximo: ${nextItem.text.toLowerCase()}` : "Tudo certo para o voo"}</span>
            </div>
            <i className="ph-duotone ph-caret-right" style={{ fontSize: 18, color: "var(--color-accent)" }} />
          </button>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <span style={{ fontSize: 17, fontWeight: 600 }}>Roteiro do voo</span>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {PHASE_LABELS.map((label, k) => {
                const isCurrent = k === state.phase;
                const isPast = k < state.phase;
                return (
                  <div key={label} style={{ display: "grid", gridTemplateColumns: "22px 1fr", gap: 12 }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                      <div style={{ width: 12, height: 12, marginTop: 6, borderRadius: "50%", background: isPast || isCurrent ? "var(--color-accent)" : "var(--color-neutral-300)", boxShadow: isCurrent ? "0 0 0 5px var(--color-accent-200)" : "none" }} />
                      {k < PHASE_LABELS.length - 1 && <div style={{ flex: 1, width: 2, minHeight: 14, background: isPast ? "var(--color-accent)" : "var(--color-neutral-300)" }} />}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingBottom: 14 }}>
                      <span style={{ fontSize: isCurrent ? 17 : 14, fontWeight: 600, color: isCurrent ? "var(--color-text)" : "var(--color-neutral-700)" }}>{label}</span>
                      {isCurrent && (
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          {state.facts.map((fact) => (
                            <div key={fact.k} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "9px 0", borderBottom: "1px solid color-mix(in srgb, var(--color-text) 8%, transparent)", fontSize: 14 }}>
                              <span style={{ color: "var(--color-neutral-700)" }}>{fact.k}</span>
                              <span style={{ fontWeight: 600, textAlign: "right" as const }}>{fact.v}{fact.note ? <span style={{ fontWeight: 400, fontStyle: "italic" as const, fontSize: 12, color: "var(--color-neutral-700)" }}> {fact.note}</span> : null}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ fontSize: 17, fontWeight: 600 }}>Próximas viagens</span>
          <button className="btn btn-ghost" onClick={() => setEditing({ mode: "new" })} style={{ fontSize: 13 }}>
            <i className="ph-duotone ph-plus" />Nova viagem
          </button>
        </div>
        {otherTrips.length === 0 && <span style={{ fontSize: 13, color: "var(--color-neutral-700)" }}>Nenhuma outra viagem por enquanto.</span>}
        {otherTrips.map((t) => (
          <div key={t.id} className="card" onClick={() => setEditing({ mode: "edit", tripId: t.id })} style={{ flexDirection: "row", alignItems: "center", gap: 14, padding: 10, cursor: "pointer" }}>
            <div style={{ width: 48, height: 48, flexShrink: 0, borderRadius: "var(--radius-md)", background: "repeating-linear-gradient(135deg,var(--color-neutral-300) 0 6px,var(--color-neutral-200) 6px 12px)" }} />
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 16, fontWeight: 600 }}>{t.city}</span>
              <span style={{ fontSize: 13, color: "var(--color-neutral-700)" }}>{t.name}</span>
            </div>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{tripDaysAway(t, now)} dias</span>
          </div>
        ))}
      </div>

      {sheet === "checkin" && f && (
        <div className="dialog-backdrop" style={{ zIndex: 50, alignItems: "flex-end" }} onClick={() => setSheet(null)}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", padding: "24px 24px 40px", display: "flex", flexDirection: "column", gap: 16, background: "var(--color-bg)", borderRadius: "var(--radius-lg) var(--radius-lg) 0 0", boxShadow: "var(--shadow-lg)", animation: "bsSheetUp 280ms cubic-bezier(.2,.8,.3,1) both" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase" as const, color: "var(--color-accent-700)" }}>
              <i className="ph-duotone ph-check-circle" />Localizador copiado
            </div>
            <span style={{ fontSize: 36, fontWeight: 600, letterSpacing: ".08em" }}>{f.pnr}</span>
            <p style={{ margin: 0 }}>Abra o site da {f.carrier}, cole o localizador, escolha o assento e volte aqui.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button className="btn btn-primary" onClick={confirmCheckin} disabled={saving} style={{ minHeight: 48, fontSize: 15 }}>
                <i className="ph-duotone ph-seal-check" />Já fiz o check-in
              </button>
              <button className="btn btn-secondary" onClick={() => setSheet(null)} style={{ minHeight: 44, fontSize: 14 }}>Ainda não</button>
            </div>
          </div>
        </div>
      )}

      {sheet === "boardingpass" && f && (
        <div className="dialog-backdrop" style={{ zIndex: 50, alignItems: "flex-end" }} onClick={() => setSheet(null)}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", padding: "24px 24px 40px", display: "flex", flexDirection: "column", gap: 16, background: "var(--color-bg)", borderRadius: "var(--radius-lg) var(--radius-lg) 0 0", boxShadow: "var(--shadow-lg)", animation: "bsSheetUp 280ms cubic-bezier(.2,.8,.3,1) both" }}>
            <span style={{ fontSize: 20, fontWeight: 600 }}>{f.carrier} · {f.flightNumber}</span>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {[["Rota", `${f.originIata} → ${f.destIata}`], ["Assento", f.seat ?? "—"], ["Grupo", f.boardingGroup ?? "—"], ["Portão", f.gate ?? "a definir"], ["Localizador", f.pnr ?? "—"], ["Bagagem", f.bagsCheckedKg ? `${f.bagsCabinKg ?? 0}+${f.bagsCheckedKg}kg` : `${f.bagsCabinKg ?? 0}kg mão`]].map(([k, v]) => (
                <div key={k} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ fontSize: 10, letterSpacing: ".08em", textTransform: "uppercase" as const, color: "var(--color-neutral-700)" }}>{k}</span>
                  <span style={{ fontSize: 17, fontWeight: 600 }}>{v}</span>
                </div>
              ))}
            </div>
            <button className="btn btn-secondary btn-block" onClick={() => setSheet(null)} style={{ minHeight: 44 }}>Fechar</button>
          </div>
        </div>
      )}

      {sheet === "checklist" && (
        <div className="dialog-backdrop" style={{ zIndex: 50, alignItems: "flex-end" }} onClick={() => setSheet(null)}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxHeight: "80vh", display: "flex", flexDirection: "column", background: "var(--color-bg)", borderRadius: "var(--radius-lg) var(--radius-lg) 0 0", boxShadow: "var(--shadow-lg)", animation: "bsSheetUp 280ms cubic-bezier(.2,.8,.3,1) both" }}>
            <div style={{ padding: "20px 24px 8px", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{ fontSize: 22, fontWeight: 600 }}>Checklist</span>
              <button className="btn btn-ghost" onClick={() => setSheet(null)}>Fechar</button>
            </div>
            <div style={{ flex: 1, overflowY: "auto" as const, padding: "8px 24px 32px", display: "flex", flexDirection: "column", gap: 20 }}>
              {(Object.keys(MOMENT_LABELS) as ChecklistMoment[]).map((moment) => {
                const items = checklist.filter((c) => c.moment === moment);
                if (items.length === 0) return null;
                const allDone = items.every((i) => i.done);
                return (
                  <div key={moment} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 4 }}>
                      <span style={{ fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase" as const, color: "var(--color-neutral-700)" }}>{MOMENT_LABELS[moment]}</span>
                      {allDone && <span className="tag tag-accent">Completo</span>}
                    </div>
                    {items.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => toggleItem(item)}
                        style={{ display: "grid", gridTemplateColumns: "24px 1fr", alignItems: "center", gap: 12, minHeight: 44, border: 0, background: "transparent", font: "inherit", fontSize: 15, color: item.done ? "var(--color-neutral-700)" : "var(--color-text)", textAlign: "left" as const, cursor: "pointer", padding: "4px 0" }}
                      >
                        <span style={{ width: 22, height: 22, display: "grid", placeItems: "center", borderRadius: "var(--radius-md)", border: "2px solid var(--color-accent)", background: item.done ? "var(--color-accent)" : "transparent", color: "var(--color-bg)", fontSize: 14 }}>
                          {item.done && <i className="ph-duotone ph-check" />}
                        </span>
                        <span>{item.text}</span>
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
