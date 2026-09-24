"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  deleteWorkoutSession,
  getActiveProgram,
  getExerciseLibrary,
  getHistory,
  getLastWeights,
  getProgramSequence,
  mergeLastWeights,
  persistWorkoutSession,
  updateWorkoutSession,
  upsertLastWeights,
} from "@/lib/data";
import {
  formatDate,
  formatDateDisplay,
  getCurrentWeek,
  getExerciseSeries,
  getSessionLabel,
  parseTopReps,
  type HistoryEntry,
  type LibraryExercise,
  type Program,
  type ProgramWorkout,
  type SessionLog,
  type SetEntry,
} from "@/lib/program";
import { C, DISPLAY, EASE, G, SCREEN_ANIM, styles } from "@/lib/styles";
import { loadWithCache, useOnline } from "@/lib/offline";
import { useEdgeSwipeBack } from "@/lib/gestures";
import ProgressChart from "./ProgressChart";

interface ProgressionBundle {
  p: Program | null;
  lib: LibraryExercise[];
  h: HistoryEntry[];
  lw: Record<string, number>;
  seq: [string, number][]; // Map doesn't survive JSON (de)serialization for the offline cache
}

interface EditingSession {
  mode: "new" | "edit";
  id?: string; // set only in "edit" mode
  date: string; // yyyy-mm-dd
  workoutId: string;
  log: SessionLog;
}

const numInputStyle = {
  width: 54,
  padding: "6px 4px",
  border: `1px solid ${C.bgHeader}`,
  borderRadius: 6,
  fontSize: 13,
  textAlign: "center" as const,
  background: C.bgCard,
  color: C.white,
};

const stagger = (i: number, base = 0) => `tabFadeUp .5s ${EASE} ${(base + i * 0.06).toFixed(2)}s both`;

/**
 * "Progressão de carga" — moved here from WorkoutApp.tsx (treino module) so
 * every historical/analytics view lives in Insights, leaving Treino focused
 * on running the active workout. Fetches its own data independently (same
 * pattern as WorkoutApp.tsx/TreinoSettings.tsx) rather than threading it all
 * through Hub.tsx.
 */
export default function ProgressionHistory({
  onBack,
  onStartWorkout,
  initialSessionId,
}: {
  onBack: () => void;
  onStartWorkout: (workoutId: string) => void;
  initialSessionId?: string;
}) {
  const supabase = createClient();
  const online = useOnline();

  const [loading, setLoading] = useState(true);
  const [program, setProgram] = useState<Program | null>(null);
  const [library, setLibrary] = useState<LibraryExercise[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [programSeq, setProgramSeq] = useState<Map<string, number>>(new Map());
  const [lastWeights, setLastWeights] = useState<Record<string, number>>({});
  const [usingCache, setUsingCache] = useState(false);

  const [historyView, setHistoryView] = useState<HistoryEntry | null>(null);
  const [viaDeepLink, setViaDeepLink] = useState(false);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const [historyFilter, setHistoryFilter] = useState<string | null>(null);
  const [chartMetric, setChartMetric] = useState<"carga" | "volume" | "frequencia">("carga");

  // Manual correction tool: add a session that failed to save or was never
  // logged, or edit/delete an existing one — for when persistSession's own
  // error handling (WorkoutApp.tsx) isn't enough (e.g. the user just forgot).
  const [editing, setEditing] = useState<EditingSession | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, offline } = await loadWithCache<ProgressionBundle>("progressionHistory", async () => {
          const [p, lib, h, lw, seq] = await Promise.all([
            getActiveProgram(supabase),
            getExerciseLibrary(supabase),
            getHistory(supabase),
            getLastWeights(supabase),
            getProgramSequence(supabase),
          ]);
          return { p, lib, h, lw, seq: Array.from(seq.entries()) };
        }, online);
        if (cancelled) return;
        setProgram(data.p);
        setLibrary(data.lib);
        setHistory(data.h);
        setLastWeights(data.lw);
        setProgramSeq(new Map(data.seq));
        setUsingCache(offline);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Entry points from Treino (a done-today workout card, or "Ver treino feito
  // hoje") deep-link straight into one session's detail instead of the list.
  // Adjusted during render (guarded by the "already consumed" comparison)
  // rather than an effect, since it only needs to run once data settles.
  const [consumedSessionId, setConsumedSessionId] = useState<string | undefined>(undefined);
  if (!loading && initialSessionId && initialSessionId !== consumedSessionId) {
    const entry = history.find((e) => e.id === initialSessionId);
    if (entry) {
      setConsumedSessionId(initialSessionId);
      setViaDeepLink(true);
      setHistoryView(entry);
    }
  }

  const detailBack = () => {
    if (viaDeepLink) onBack();
    else setHistoryView(null);
  };
  const backSwipeRef = useEdgeSwipeBack(editing ? () => setEditing(null) : historyView ? detailBack : onBack);

  function buildFreshLog(workout: ProgramWorkout): SessionLog {
    const log: SessionLog = {};
    workout.exercises.forEach((ex) => {
      const kg = lastWeights[ex.exerciseId] ?? 0;
      const reps = parseTopReps(ex.reps);
      log[ex.exerciseId] = Array.from({ length: Math.max(1, ex.sets) }, (_, i) => ({ set: i + 1, kg, reps }));
    });
    return log;
  }

  function openNewSession() {
    const workout = program?.workouts[0];
    if (!workout) return;
    setSaveError(null);
    setEditing({ mode: "new", date: formatDate(new Date()), workoutId: workout.id, log: buildFreshLog(workout) });
  }

  function openEditSession(entry: HistoryEntry) {
    setSaveError(null);
    setEditing({
      mode: "edit",
      id: entry.id,
      date: entry.date,
      workoutId: entry.programWorkoutId ?? "",
      log: JSON.parse(JSON.stringify(entry.exercises)),
    });
  }

  function updateSet(exId: string, idx: number, patch: Partial<SetEntry>) {
    setEditing((prev) => {
      if (!prev) return prev;
      const sets = [...(prev.log[exId] ?? [])];
      sets[idx] = { ...sets[idx], ...patch };
      return { ...prev, log: { ...prev.log, [exId]: sets } };
    });
  }

  function removeSet(exId: string, idx: number) {
    setEditing((prev) => {
      if (!prev) return prev;
      const sets = (prev.log[exId] ?? []).filter((_, i) => i !== idx);
      return { ...prev, log: { ...prev.log, [exId]: sets } };
    });
  }

  function addSet(exId: string) {
    setEditing((prev) => {
      if (!prev) return prev;
      const sets = prev.log[exId] ?? [];
      const last = sets[sets.length - 1];
      const newSet: SetEntry = { set: sets.length + 1, kg: last?.kg ?? lastWeights[exId] ?? 0, reps: last?.reps ?? null };
      return { ...prev, log: { ...prev.log, [exId]: [...sets, newSet] } };
    });
  }

  async function handleSaveEditing() {
    if (!editing || !program) return;
    const workout = program.workouts.find((w) => w.id === editing.workoutId);
    if (!workout) return;
    const cleanLog = Object.fromEntries(Object.entries(editing.log).filter(([, sets]) => sets.length > 0));
    setSaving(true);
    setSaveError(null);
    try {
      if (editing.mode === "new") {
        const entry = {
          date: editing.date,
          week: getCurrentWeek(program, history),
          programId: program.id,
          programWorkoutId: workout.id,
          workoutLabel: workout.name,
          workoutEmoji: workout.emoji,
          sessionLabel: getSessionLabel(program, workout, history),
          exercises: cleanLog,
        };
        const { id, lastWeights: newLw } = await persistWorkoutSession(supabase, entry, lastWeights);
        setHistory((prev) => [...prev, { id, ...entry }]);
        setLastWeights(newLw);
      } else if (editing.id) {
        await updateWorkoutSession(supabase, editing.id, { date: editing.date, exercises: cleanLog });
        const newLw = mergeLastWeights(cleanLog, lastWeights);
        await upsertLastWeights(supabase, newLw);
        setLastWeights(newLw);
        setHistory((prev) => prev.map((e) => (e.id === editing.id ? { ...e, date: editing.date, exercises: cleanLog } : e)));
        setHistoryView((prev) => (prev && prev.id === editing.id ? { ...prev, date: editing.date, exercises: cleanLog } : prev));
      }
      setEditing(null);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Falha ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteSession(id: string) {
    setSaving(true);
    setSaveError(null);
    try {
      await deleteWorkoutSession(supabase, id);
      setHistory((prev) => prev.filter((e) => e.id !== id));
      setConfirmDeleteId(null);
      setHistoryView(null);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Falha ao excluir.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div style={styles.container} ref={backSwipeRef}>
        <div style={styles.loadingWrap}>Carregando…</div>
      </div>
    );
  }

  if (editing) {
    const editWorkout = program?.workouts.find((w) => w.id === editing.workoutId);
    const exerciseList: { exerciseId: string; name: string }[] =
      editing.mode === "new" && editWorkout
        ? editWorkout.exercises.map((ex) => ({ exerciseId: ex.exerciseId, name: ex.name }))
        : Object.keys(editing.log).map((exId) => {
            const fromWorkout = editWorkout?.exercises.find((ex) => ex.exerciseId === exId);
            const fromLibrary = library.find((l) => l.id === exId);
            return { exerciseId: exId, name: fromWorkout?.name ?? fromLibrary?.name ?? exId };
          });

    return (
      <div style={styles.container} ref={backSwipeRef}>
        <div style={{ animation: SCREEN_ANIM }}>
          <div style={styles.topNav}>
            <button onClick={() => setEditing(null)} style={styles.backBtn}>← Cancelar</button>
          </div>
          <div style={styles.histBody}>
            <h2 style={styles.detailTitle}>{editing.mode === "new" ? "Adicionar sessão perdida" : "Editar sessão"}</h2>
            <p style={styles.detailSub}>
              {editing.mode === "new"
                ? "Pra quando você esqueceu de salvar um treino, ou o salvamento falhou."
                : "Ajuste os pesos/reps ou a data desta sessão."}
            </p>

            {editing.mode === "new" && program && (
              <div style={{ display: "flex", gap: 8, margin: "14px 0" }}>
                {program.workouts.map((w) => (
                  <button
                    key={w.id}
                    onClick={() => setEditing({ mode: "new", date: editing.date, workoutId: w.id, log: buildFreshLog(w) })}
                    style={{ ...styles.filterChip, ...(editing.workoutId === w.id ? styles.filterChipActive : null), flex: 1, textAlign: "center" }}
                  >
                    {w.name}
                  </button>
                ))}
              </div>
            )}

            <label style={{ display: "block", fontSize: 11.5, color: C.midGray, margin: "16px 0" }}>
              Data
              <input
                type="date"
                value={editing.date}
                onChange={(e) => setEditing((prev) => (prev ? { ...prev, date: e.target.value } : prev))}
                style={{ display: "block", marginTop: 6, padding: "8px 10px", border: `1px solid ${C.bgHeader}`, borderRadius: 8, fontSize: 13, background: C.bgCard, color: C.white }}
              />
            </label>

            {exerciseList.map((ex) => (
              <div key={ex.exerciseId} style={styles.histExCard}>
                <div style={styles.histExName}>{ex.name}</div>
                {(editing.log[ex.exerciseId] ?? []).map((s, idx) => (
                  <div key={idx} style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                    <span style={{ fontSize: 11, color: C.midGray, width: 24 }}>{`S${idx + 1}`}</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={s.kg}
                      onChange={(e) => updateSet(ex.exerciseId, idx, { kg: parseFloat(e.target.value) || 0 })}
                      style={numInputStyle}
                    />
                    <span style={{ fontSize: 11, color: C.midGray }}>kg ×</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={s.reps ?? ""}
                      onChange={(e) => updateSet(ex.exerciseId, idx, { reps: e.target.value ? parseInt(e.target.value, 10) : null })}
                      style={numInputStyle}
                    />
                    <span style={{ fontSize: 11, color: C.midGray }}>reps</span>
                    <button
                      onClick={() => removeSet(ex.exerciseId, idx)}
                      style={{ marginLeft: "auto", background: "transparent", border: "none", color: C.red, fontSize: 16, cursor: "pointer" }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <button onClick={() => addSet(ex.exerciseId)} style={{ ...styles.ghostBtn, marginTop: 10, padding: "6px 12px", fontSize: 11.5 }}>
                  + Série
                </button>
              </div>
            ))}

            {saveError && <div style={{ color: C.red, fontSize: 12.5, margin: "10px 0" }}>⚠️ {saveError}</div>}

            <button className="tab-press" onClick={handleSaveEditing} style={{ ...styles.okBtn, marginTop: 14, marginBottom: 24 }} disabled={saving}>
              {saving ? "Salvando…" : "Salvar"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (historyView) {
    const entry = historyView;
    const workout = program?.workouts.find((w) => w.id === entry.programWorkoutId);
    const rows = workout
      ? workout.exercises.filter((ex) => (entry.exercises[ex.exerciseId] || []).length > 0)
      : Object.keys(entry.exercises).map((exId) => {
          const lib = library.find((l) => l.id === exId);
          return { exerciseId: exId, name: lib?.name ?? exId, id: exId, unit: lib?.unit ?? "total", sets: 0, reps: "", holdSeconds: null, orderIndex: 0 };
        });
    return (
      <div style={styles.container} ref={backSwipeRef}>
        <div style={{ animation: SCREEN_ANIM }}>
          <div style={styles.topNav}>
            <button onClick={detailBack} style={styles.backBtn}>← Voltar</button>
          </div>
          <div style={styles.histBody}>
            <h2 style={styles.detailTitle}>
              {`${entry.workoutEmoji ?? workout?.emoji ?? ""} ${entry.programId && programSeq.has(entry.programId) ? `P${programSeq.get(entry.programId)} ` : ""}${entry.workoutLabel}`.trim()}
            </h2>
            <p style={styles.detailSub}>{`${formatDateDisplay(entry.date)}  •  ${entry.sessionLabel}`}</p>
            <div style={styles.detailStatsRow}>
              {(() => {
                let entrySets = 0;
                let entryVolume = 0;
                Object.values(entry.exercises).forEach((arr) => arr.forEach((s) => { entrySets += 1; entryVolume += s.kg || 0; }));
                const detailStats = [
                  { value: Object.keys(entry.exercises).length, label: "EXERCÍCIOS" },
                  { value: entrySets, label: "SÉRIES" },
                  { value: `${entryVolume}kg`, label: "CARGA", accent: true },
                ];
                return detailStats.map((s) => (
                  <div key={s.label} style={styles.detailStat}>
                    <span style={{ fontFamily: DISPLAY, fontSize: 19, fontWeight: 600, fontVariantNumeric: "tabular-nums", color: s.accent ? C.accent : C.white }}>{s.value}</span>
                    <span style={{ fontSize: 9, color: C.midGray, letterSpacing: 1 }}>{s.label}</span>
                  </div>
                ));
              })()}
            </div>
            {rows.map((ex, i) => {
              const currentMax = Math.max(...entry.exercises[ex.exerciseId].map((s) => s.kg || 0));
              const priorEntry = history
                .filter((e) => e.date < entry.date && (e.exercises[ex.exerciseId]?.length ?? 0) > 0)
                .slice(-1)[0];
              const priorMax = priorEntry ? Math.max(...priorEntry.exercises[ex.exerciseId].map((s) => s.kg || 0)) : null;
              const delta = priorMax != null ? currentMax - priorMax : null;
              return (
              <div key={ex.exerciseId} style={{ ...styles.histExCard, animation: stagger(i) }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <div style={styles.histExName}>{ex.name}</div>
                  {delta != null && (
                    <span style={{ ...styles.histExDelta, color: delta > 0 ? C.accent : delta < 0 ? C.red : C.midGray }}>
                      {delta === 0 ? "manteve" : `${delta > 0 ? "+" : ""}${delta}kg`}
                    </span>
                  )}
                </div>
                <div style={styles.histSetsRow}>
                  {entry.exercises[ex.exerciseId].map((s, j) => (
                    <div key={j} style={styles.histSetBadge}>
                      <span style={styles.histSetLabel}>{`S${s.set}`}</span>
                      <span style={styles.histSetKg}>{s.reps ? `${s.kg}kg×${s.reps}` : `${s.kg}kg`}</span>
                    </div>
                  ))}
                </div>
              </div>
              );
            })}
            {workout && (
              <button
                className="tab-press"
                onClick={() => {
                  onStartWorkout(workout.id);
                  onBack();
                }}
                style={{ ...styles.historyBtn, marginTop: 6 }}
              >
                Treinar novamente
              </button>
            )}
            <button className="tab-press" onClick={() => openEditSession(entry)} style={{ ...styles.ghostBtn, marginTop: 12, width: "100%" }}>
              Editar sessão
            </button>
            {confirmDeleteId === entry.id ? (
              <div style={{ marginTop: 12, padding: 12, borderRadius: 10, background: "rgba(192,57,43,.08)", border: `1px solid ${C.red}` }}>
                <div style={{ fontSize: 12.5, color: C.red, marginBottom: 10 }}>Excluir esta sessão? Não dá pra desfazer.</div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    className="tab-press"
                    onClick={() => handleDeleteSession(entry.id)}
                    disabled={saving}
                    style={{ ...styles.ghostBtn, flex: 1, borderColor: C.red, color: C.red }}
                  >
                    {saving ? "Excluindo…" : "Sim, excluir"}
                  </button>
                  <button className="tab-press" onClick={() => setConfirmDeleteId(null)} style={{ ...styles.ghostBtn, flex: 1 }}>
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDeleteId(entry.id)}
                style={{ display: "block", width: "100%", marginTop: 10, marginBottom: 24, background: "transparent", border: "none", color: C.red, fontSize: 12, cursor: "pointer" }}
              >
                Excluir sessão
              </button>
            )}
            {saveError && <div style={{ color: C.red, fontSize: 12.5, marginBottom: 16 }}>⚠️ {saveError}</div>}
          </div>
        </div>
      </div>
    );
  }

  const grouped: Record<string, HistoryEntry[]> = {};
  history.forEach((e) => {
    const key = e.programWorkoutId ?? e.workoutLabel;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(e);
  });

  const exercisesWithData = library.filter((ex) =>
    history.some((e) => (e.exercises[ex.id]?.length ?? 0) > 0)
  );
  const activeId = selectedExerciseId && exercisesWithData.some((ex) => ex.id === selectedExerciseId)
    ? selectedExerciseId
    : exercisesWithData[0]?.id ?? null;
  const activeEx = exercisesWithData.find((ex) => ex.id === activeId) ?? null;

  const weeklyBuckets = (metric: "volume" | "frequencia") => {
    const today = new Date();
    const buckets = new Array(8).fill(0);
    history.forEach((e) => {
      const [y, m, d] = e.date.split("-").map(Number);
      const entryDate = new Date(y, m - 1, d);
      const daysAgo = Math.floor((today.getTime() - entryDate.getTime()) / 86400000);
      const weekIdx = 7 - Math.floor(daysAgo / 7);
      if (weekIdx < 0 || weekIdx > 7) return;
      if (metric === "frequencia") {
        buckets[weekIdx] += 1;
      } else {
        Object.values(e.exercises).forEach((sets) => sets.forEach((s) => { buckets[weekIdx] += s.kg || 0; }));
      }
    });
    return buckets;
  };

  return (
    <div style={styles.container} ref={backSwipeRef}>
      <div style={{ animation: SCREEN_ANIM }}>
        <div style={styles.topNav}>
          <button onClick={onBack} style={styles.backBtn}>← Insights</button>
        </div>
        <div style={styles.histBody}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <h2 style={{ ...styles.histTitle, marginBottom: 0 }}>Progressão de Carga</h2>
            {program && (
              <button onClick={openNewSession} style={{ ...styles.ghostBtn, padding: "8px 12px", fontSize: 11.5, whiteSpace: "nowrap" }}>
                + Sessão perdida
              </button>
            )}
          </div>
          {!online && usingCache && (
            <div style={styles.offlineBanner}>📡 Sem conexão — mostrando dados salvos.</div>
          )}
          {history.length === 0 && (
            <div style={styles.emptyState}>
              Nenhum treino registrado ainda.
              <br />
              <span style={{ color: C.midGray }}>Finalize um treino para ver a evolução das cargas.</span>
            </div>
          )}
          {history.length > 0 && (
            <>
              {chartMetric === "carga" && activeEx && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 12, marginBottom: 4 }}>
                    {exercisesWithData.map((ex) => {
                      const isActive = ex.id === activeId;
                      return (
                        <button
                          key={ex.id}
                          onClick={() => setSelectedExerciseId(ex.id)}
                          style={{
                            flexShrink: 0,
                            padding: "8px 14px",
                            borderRadius: 10,
                            fontSize: 12,
                            fontWeight: 600,
                            whiteSpace: "nowrap",
                            cursor: "pointer",
                            border: `1px solid ${isActive ? C.accent : C.bgHeader}`,
                            background: isActive ? C.accentSoft : "transparent",
                            color: isActive ? C.accent : C.lightGray,
                          }}
                        >
                          {ex.name}
                        </button>
                      );
                    })}
                  </div>
                  <ProgressChart points={getExerciseSeries(history, activeEx.id)} exerciseName={activeEx.name} unit={activeEx.unit} />
                </div>
              )}
              {(chartMetric === "volume" || chartMetric === "frequencia") && (
                <div style={{ ...styles.chartCard, margin: "0 0 12px" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>
                    {chartMetric === "volume" ? "Volume semanal" : "Frequência semanal"}
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 84 }}>
                    {(() => {
                      const buckets = weeklyBuckets(chartMetric);
                      const max = Math.max(1, ...buckets);
                      return buckets.map((v, i) => (
                        <div
                          key={i}
                          style={{
                            flex: 1,
                            height: `${Math.max(4, (v / max) * 100)}%`,
                            borderRadius: 4,
                            transformOrigin: "bottom",
                            background: i === buckets.length - 1 ? G.limeBar : "rgba(13,27,42,.1)",
                            boxShadow: "none",
                            animation: `tabBarGrow 500ms ${EASE} ${(i * 0.05).toFixed(2)}s both`,
                          }}
                        />
                      ));
                    })()}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9.5, color: C.faint, marginTop: 6 }}>
                    <span>8 sem. atrás</span>
                    <span>hoje</span>
                  </div>
                </div>
              )}
              <div style={{ display: "flex", gap: 8, marginBottom: 30 }}>
                {(["carga", "volume", "frequencia"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setChartMetric(m)}
                    style={{ ...styles.filterChip, ...(chartMetric === m ? styles.filterChipActive : null), flex: 1, textAlign: "center" }}
                  >
                    {m === "carga" ? "Carga" : m === "volume" ? "Volume" : "Frequência"}
                  </button>
                ))}
              </div>
            </>
          )}
          {(() => {
            const groupLabels: Record<string, string> = {};
            Object.entries(grouped).forEach(([key, entries]) => {
              const first = entries[0];
              const workout = program?.workouts.find((w) => w.id === first.programWorkoutId);
              const seqPrefix = first.programId && programSeq.has(first.programId) ? `P${programSeq.get(first.programId)} ` : "";
              groupLabels[key] = `${first.workoutEmoji ?? workout?.emoji ?? ""} ${seqPrefix}${first.workoutLabel}`.trim();
            });
            const groupKeys = Object.keys(grouped);
            if (groupKeys.length < 2) return null;
            return (
              <div style={{ ...styles.filterRow, overflowX: "auto" }}>
                <button onClick={() => setHistoryFilter(null)} style={{ ...styles.filterChip, ...(historyFilter === null ? styles.filterChipActive : null), flexShrink: 0 }}>
                  Tudo
                </button>
                {groupKeys.map((key) => (
                  <button
                    key={key}
                    onClick={() => setHistoryFilter(key === historyFilter ? null : key)}
                    style={{ ...styles.filterChip, ...(historyFilter === key ? styles.filterChipActive : null), whiteSpace: "nowrap", flexShrink: 0 }}
                  >
                    {groupLabels[key]}
                  </button>
                ))}
              </div>
            );
          })()}
          {Object.entries(grouped)
            .filter(([key]) => historyFilter === null || key === historyFilter)
            .map(([key, entries]) => {
            if (!entries || entries.length === 0) return null;
            const first = entries[0];
            const workout = program?.workouts.find((w) => w.id === first.programWorkoutId);
            const seqPrefix = first.programId && programSeq.has(first.programId) ? `P${programSeq.get(first.programId)} ` : "";
            const label = `${first.workoutEmoji ?? workout?.emoji ?? ""} ${seqPrefix}${first.workoutLabel}`.trim();
            return (
              <div key={key} style={{ marginBottom: 34 }}>
                <div style={styles.groupHeader}>
                  <span style={styles.groupName}>{label}</span>
                  <span style={styles.groupRule} />
                  <span style={styles.groupCount}>{`${entries.length} ${entries.length === 1 ? "SESSÃO" : "SESSÕES"}`}</span>
                </div>
                {entries.slice().reverse().map((e, i) => (
                  <button
                    key={e.id ?? i}
                    onClick={() => {
                      setViaDeepLink(false);
                      setHistoryView(e);
                    }}
                    style={styles.histEntry}
                  >
                    <span style={{ ...styles.histEntryBadge, ...(e.sessionLabel.charAt(0) === "A" ? styles.histEntryBadgeA : null) }}>
                      {e.sessionLabel.charAt(0)}
                    </span>
                    <span style={styles.histEntryLeft}>
                      <span style={styles.histEntryDate}>{formatDateDisplay(e.date)}</span>
                      <span style={styles.histEntryWeek}>{e.sessionLabel}</span>
                    </span>
                    <span style={styles.histEntryCount}>{`${Object.keys(e.exercises).length} ex. →`}</span>
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
