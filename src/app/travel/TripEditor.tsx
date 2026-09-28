"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  addChecklistItem,
  addFlight,
  createTrip,
  deleteChecklistItem,
  deleteFlight,
  deleteTrip,
  getTripDetail,
  toggleChecklistItem,
  updateFlight,
  updateTrip,
  type NewFlightInput,
} from "@/lib/travelData";
import { MOMENT_LABELS, type ChecklistItem, type ChecklistMoment, type Flight } from "@/lib/travel";

interface FlightFormState {
  carrier: string;
  flightNumber: string;
  originIata: string;
  originCity: string;
  originTerminal: string;
  destIata: string;
  destCity: string;
  destTerminal: string;
  departureAt: string;
  arrivalAt: string;
  pnr: string;
  seat: string;
  boardingGroup: string;
  gate: string;
  bagsCabinKg: string;
  bagsCheckedKg: string;
  checkinOpensAt: string;
}

function emptyFlightForm(): FlightFormState {
  return {
    carrier: "", flightNumber: "", originIata: "", originCity: "", originTerminal: "",
    destIata: "", destCity: "", destTerminal: "", departureAt: "", arrivalAt: "",
    pnr: "", seat: "", boardingGroup: "", gate: "", bagsCabinKg: "", bagsCheckedKg: "", checkinOpensAt: "",
  };
}

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function flightFormFrom(f: Flight): FlightFormState {
  return {
    carrier: f.carrier, flightNumber: f.flightNumber, originIata: f.originIata, originCity: f.originCity,
    originTerminal: f.originTerminal ?? "", destIata: f.destIata, destCity: f.destCity, destTerminal: f.destTerminal ?? "",
    departureAt: toDatetimeLocal(f.departureAt), arrivalAt: toDatetimeLocal(f.arrivalAt),
    pnr: f.pnr ?? "", seat: f.seat ?? "", boardingGroup: f.boardingGroup ?? "", gate: f.gate ?? "",
    bagsCabinKg: f.bagsCabinKg?.toString() ?? "", bagsCheckedKg: f.bagsCheckedKg?.toString() ?? "",
    checkinOpensAt: toDatetimeLocal(f.checkinOpensAt),
  };
}

function toFlightInput(form: FlightFormState): NewFlightInput | null {
  if (!form.carrier || !form.flightNumber || !form.originIata || !form.destIata || !form.departureAt || !form.arrivalAt) return null;
  return {
    carrier: form.carrier, flightNumber: form.flightNumber,
    originIata: form.originIata.toUpperCase(), originCity: form.originCity, originTerminal: form.originTerminal || null,
    destIata: form.destIata.toUpperCase(), destCity: form.destCity, destTerminal: form.destTerminal || null,
    departureAt: new Date(form.departureAt).toISOString(), arrivalAt: new Date(form.arrivalAt).toISOString(),
    pnr: form.pnr || null, seat: form.seat || null, boardingGroup: form.boardingGroup || null, gate: form.gate || null,
    bagsCabinKg: form.bagsCabinKg ? Number(form.bagsCabinKg) : null, bagsCheckedKg: form.bagsCheckedKg ? Number(form.bagsCheckedKg) : null,
    checkinOpensAt: form.checkinOpensAt ? new Date(form.checkinOpensAt).toISOString() : null,
  };
}

const fieldStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 5 };
const gridRow2: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 };
const gridRow3: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 };

function FlightForm({ value, onChange }: { value: FlightFormState; onChange: (v: FlightFormState) => void }) {
  const set = <K extends keyof FlightFormState>(k: K) => (e: React.ChangeEvent<HTMLInputElement>) => onChange({ ...value, [k]: e.target.value });
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={gridRow2}>
        <div className="field" style={fieldStyle}><label>Companhia</label><input className="input" value={value.carrier} onChange={set("carrier")} placeholder="TAP" /></div>
        <div className="field" style={fieldStyle}><label>Número do voo</label><input className="input" value={value.flightNumber} onChange={set("flightNumber")} placeholder="TP 88" /></div>
      </div>
      <div style={gridRow3}>
        <div className="field" style={fieldStyle}><label>Origem (IATA)</label><input className="input" value={value.originIata} onChange={set("originIata")} placeholder="GRU" maxLength={3} /></div>
        <div className="field" style={fieldStyle}><label>Cidade de origem</label><input className="input" value={value.originCity} onChange={set("originCity")} placeholder="São Paulo" /></div>
        <div className="field" style={fieldStyle}><label>Terminal</label><input className="input" value={value.originTerminal} onChange={set("originTerminal")} placeholder="3" /></div>
      </div>
      <div style={gridRow3}>
        <div className="field" style={fieldStyle}><label>Destino (IATA)</label><input className="input" value={value.destIata} onChange={set("destIata")} placeholder="LIS" maxLength={3} /></div>
        <div className="field" style={fieldStyle}><label>Cidade de destino</label><input className="input" value={value.destCity} onChange={set("destCity")} placeholder="Lisboa" /></div>
        <div className="field" style={fieldStyle}><label>Terminal</label><input className="input" value={value.destTerminal} onChange={set("destTerminal")} placeholder="1" /></div>
      </div>
      <div style={gridRow2}>
        <div className="field" style={fieldStyle}><label>Partida</label><input className="input" type="datetime-local" value={value.departureAt} onChange={set("departureAt")} /></div>
        <div className="field" style={fieldStyle}><label>Chegada</label><input className="input" type="datetime-local" value={value.arrivalAt} onChange={set("arrivalAt")} /></div>
      </div>
      <div className="field" style={fieldStyle}><label>Check-in abre em</label><input className="input" type="datetime-local" value={value.checkinOpensAt} onChange={set("checkinOpensAt")} /></div>
      <div style={gridRow3}>
        <div className="field" style={fieldStyle}><label>Localizador</label><input className="input" value={value.pnr} onChange={set("pnr")} placeholder="K7XQ2M" /></div>
        <div className="field" style={fieldStyle}><label>Assento</label><input className="input" value={value.seat} onChange={set("seat")} placeholder="23A" /></div>
        <div className="field" style={fieldStyle}><label>Grupo</label><input className="input" value={value.boardingGroup} onChange={set("boardingGroup")} placeholder="4" /></div>
      </div>
      <div style={gridRow3}>
        <div className="field" style={fieldStyle}><label>Portão</label><input className="input" value={value.gate} onChange={set("gate")} placeholder="B12" /></div>
        <div className="field" style={fieldStyle}><label>Bagagem de mão (kg)</label><input className="input" type="number" value={value.bagsCabinKg} onChange={set("bagsCabinKg")} placeholder="10" /></div>
        <div className="field" style={fieldStyle}><label>Despachada (kg)</label><input className="input" type="number" value={value.bagsCheckedKg} onChange={set("bagsCheckedKg")} placeholder="23" /></div>
      </div>
    </div>
  );
}

export default function TripEditor({ tripId, onClose, onSaved }: { tripId: string | null; onClose: () => void; onSaved: () => void }) {
  const supabase = createClient();
  const isNew = tripId === null;
  const [loading, setLoading] = useState(!isNew);
  const [city, setCity] = useState("");
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [flights, setFlights] = useState<Flight[]>([]);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [newFlightForm, setNewFlightForm] = useState<FlightFormState>(emptyFlightForm());
  const [addingFlight, setAddingFlight] = useState(false);
  const [editingFlight, setEditingFlight] = useState<{ id: string; form: FlightFormState } | null>(null);
  const [newItemText, setNewItemText] = useState("");
  const [newItemMoment, setNewItemMoment] = useState<ChecklistMoment>("dias-antes");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isNew) return;
    let cancelled = false;
    (async () => {
      try {
        const d = await getTripDetail(supabase, tripId as string);
        if (cancelled || !d) return;
        setCity(d.city);
        setName(d.name);
        setStartDate(d.startDate);
        setEndDate(d.endDate);
        setFlights(d.flights);
        setChecklist(d.checklist);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Falha ao carregar a viagem.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId]);

  async function handleCreate() {
    const flightInput = toFlightInput(newFlightForm);
    if (!city || !name || !startDate || !endDate || !flightInput) {
      setError("Preencha cidade, nome, datas e os dados do voo (companhia, número, origem/destino, partida e chegada).");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createTrip(supabase, { city, name, startDate, endDate }, flightInput);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao salvar a viagem.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveTripFields() {
    if (!city || !name || !startDate || !endDate) return;
    setSaving(true);
    setError(null);
    try {
      await updateTrip(supabase, tripId as string, { city, name, startDate, endDate });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddFlight() {
    const flightInput = toFlightInput(newFlightForm);
    if (!flightInput) {
      setError("Preencha ao menos companhia, número, origem/destino, partida e chegada.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await addFlight(supabase, tripId as string, flightInput, flights.length);
      const detail = await getTripDetail(supabase, tripId as string);
      if (detail) setFlights(detail.flights);
      setAddingFlight(false);
      setNewFlightForm(emptyFlightForm());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao adicionar o voo.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveFlight() {
    if (!editingFlight) return;
    const flightInput = toFlightInput(editingFlight.form);
    if (!flightInput) {
      setError("Preencha ao menos companhia, número, origem/destino, partida e chegada.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await updateFlight(supabase, editingFlight.id, flightInput);
      setFlights((prev) => prev.map((f) => (f.id === editingFlight.id ? { ...f, ...flightInput } : f)));
      setEditingFlight(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao salvar o voo.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteFlight(id: string) {
    setSaving(true);
    try {
      await deleteFlight(supabase, id);
      setFlights((prev) => prev.filter((f) => f.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao excluir o voo.");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleItem(item: ChecklistItem) {
    setChecklist((prev) => prev.map((c) => (c.id === item.id ? { ...c, done: !c.done } : c)));
    try {
      await toggleChecklistItem(supabase, item.id, !item.done);
    } catch (err) {
      console.error("Falha ao atualizar item:", err);
    }
  }

  async function handleAddItem() {
    if (!newItemText.trim()) return;
    setSaving(true);
    try {
      await addChecklistItem(supabase, tripId as string, newItemText.trim(), newItemMoment, checklist.length);
      const detail = await getTripDetail(supabase, tripId as string);
      if (detail) setChecklist(detail.checklist);
      setNewItemText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao adicionar item.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteItem(id: string) {
    setChecklist((prev) => prev.filter((c) => c.id !== id));
    try {
      await deleteChecklistItem(supabase, id);
    } catch (err) {
      console.error("Falha ao excluir item:", err);
    }
  }

  async function handleDeleteTrip() {
    setSaving(true);
    try {
      await deleteTrip(supabase, tripId as string);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao excluir a viagem.");
      setSaving(false);
    }
  }

  if (loading) return <div style={{ padding: 24, color: "var(--color-neutral-700)" }}>Carregando…</div>;

  return (
    <div style={{ padding: "20px 20px 60px", display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h1 style={{ margin: 0 }}>{isNew ? "Nova viagem" : "Editar viagem"}</h1>
        <button className="btn btn-ghost" onClick={onClose}>Voltar</button>
      </div>

      {error && <div style={{ padding: "10px 12px", borderRadius: "var(--radius-md)", background: "var(--color-accent-2-100)", color: "var(--color-accent-2-800)", fontSize: 14 }}>{error}</div>}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <span style={{ fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase" as const, color: "var(--color-neutral-700)" }}>Viagem</span>
        <div style={gridRow2}>
          <div className="field" style={fieldStyle}><label>Cidade</label><input className="input" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Lisboa" /></div>
          <div className="field" style={fieldStyle}><label>Nome da viagem</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Fim de ano" /></div>
        </div>
        <div style={gridRow2}>
          <div className="field" style={fieldStyle}><label>Início</label><input className="input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
          <div className="field" style={fieldStyle}><label>Fim</label><input className="input" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
        </div>
        {!isNew && (
          <button className="btn btn-secondary" onClick={handleSaveTripFields} disabled={saving} style={{ alignSelf: "flex-start" }}>Salvar viagem</button>
        )}
      </div>

      {isNew && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <span style={{ fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase" as const, color: "var(--color-neutral-700)" }}>Voo</span>
          <FlightForm value={newFlightForm} onChange={setNewFlightForm} />
          <button className="btn btn-primary btn-block" onClick={handleCreate} disabled={saving} style={{ minHeight: 48 }}>Criar viagem</button>
        </div>
      )}

      {!isNew && (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <span style={{ fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase" as const, color: "var(--color-neutral-700)" }}>Voos</span>
            {flights.map((f) => (
              <div key={f.id} className="card" style={{ gap: 10 }}>
                {editingFlight?.id === f.id ? (
                  <>
                    <FlightForm value={editingFlight.form} onChange={(v) => setEditingFlight({ id: f.id, form: v })} />
                    <div style={{ display: "flex", gap: 8 }}>
                      <button className="btn btn-primary" onClick={handleSaveFlight} disabled={saving}>Salvar voo</button>
                      <button className="btn btn-secondary" onClick={() => setEditingFlight(null)}>Cancelar</button>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontWeight: 600 }}>{f.carrier} · {f.flightNumber}</span>
                      <span>{f.originIata} → {f.destIata}</span>
                    </div>
                    <span style={{ fontSize: 13, color: "var(--color-neutral-700)" }}>
                      {new Date(f.departureAt).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                      {" → "}
                      {new Date(f.arrivalAt).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button className="btn btn-secondary" onClick={() => setEditingFlight({ id: f.id, form: flightFormFrom(f) })}>Editar</button>
                      <button className="btn btn-secondary" onClick={() => handleDeleteFlight(f.id)} disabled={saving}>Excluir</button>
                    </div>
                  </>
                )}
              </div>
            ))}
            {addingFlight ? (
              <div className="card" style={{ gap: 10 }}>
                <FlightForm value={newFlightForm} onChange={setNewFlightForm} />
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn btn-primary" onClick={handleAddFlight} disabled={saving}>Adicionar voo</button>
                  <button className="btn btn-secondary" onClick={() => { setAddingFlight(false); setNewFlightForm(emptyFlightForm()); }}>Cancelar</button>
                </div>
              </div>
            ) : (
              <button className="btn btn-secondary" onClick={() => setAddingFlight(true)} style={{ alignSelf: "flex-start" }}>+ Adicionar voo (ex. volta)</button>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <span style={{ fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase" as const, color: "var(--color-neutral-700)" }}>Checklist</span>
            {(Object.keys(MOMENT_LABELS) as ChecklistMoment[]).map((moment) => {
              const items = checklist.filter((c) => c.moment === moment);
              return (
                <div key={moment} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={{ fontSize: 11, color: "var(--color-neutral-700)" }}>{MOMENT_LABELS[moment]}</span>
                  {items.map((item) => (
                    <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span
                        onClick={() => handleToggleItem(item)}
                        style={{ width: 20, height: 20, display: "grid", placeItems: "center", borderRadius: "var(--radius-md)", border: "2px solid var(--color-accent)", background: item.done ? "var(--color-accent)" : "transparent", color: "var(--color-bg)", fontSize: 12, cursor: "pointer", flexShrink: 0 }}
                      >
                        {item.done && <i className="ph-duotone ph-check" />}
                      </span>
                      <span style={{ flex: 1, fontSize: 14, textDecoration: item.done ? "line-through" : "none", opacity: item.done ? 0.6 : 1 }}>{item.text}</span>
                      <button className="btn btn-ghost" onClick={() => handleDeleteItem(item.id)} style={{ fontSize: 12 }}>Excluir</button>
                    </div>
                  ))}
                </div>
              );
            })}
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input className="input" value={newItemText} onChange={(e) => setNewItemText(e.target.value)} placeholder="Novo item" style={{ flex: 1 }} />
              <select className="input" value={newItemMoment} onChange={(e) => setNewItemMoment(e.target.value as ChecklistMoment)} style={{ width: 130 }}>
                {(Object.keys(MOMENT_LABELS) as ChecklistMoment[]).map((m) => <option key={m} value={m}>{MOMENT_LABELS[m]}</option>)}
              </select>
              <button className="btn btn-secondary" onClick={handleAddItem} disabled={saving}>+</button>
            </div>
          </div>

          <div style={{ borderTop: "1px solid var(--color-divider)", paddingTop: 20 }}>
            {confirmDelete ? (
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-secondary" onClick={handleDeleteTrip} disabled={saving} style={{ color: "var(--color-accent-2-700)" }}>Confirmar exclusão</button>
                <button className="btn btn-secondary" onClick={() => setConfirmDelete(false)}>Cancelar</button>
              </div>
            ) : (
              <button className="btn btn-ghost" onClick={() => setConfirmDelete(true)} style={{ color: "var(--color-accent-2-700)" }}>Excluir viagem</button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
