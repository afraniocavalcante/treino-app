"use client";

import { useEffect, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  addLibraryExercise,
  addProgramPhase,
  addProgramWorkout,
  addProgramWorkoutExercise,
  createProgram,
  deleteProgram,
  deleteProgramPhase,
  deleteProgramWorkout,
  deleteProgramWorkoutExercise,
  reorderProgramWorkoutExercises,
  updateProgramWorkoutExercise,
  scheduleNextProgram,
} from "@/lib/data";
import {
  formatDateDisplay,
  getCurrentWeek,
  PHASE_COLOR_HEX,
  type ExerciseUnit,
  type HistoryEntry,
  type LibraryExercise,
  type MuscleGroup,
  type PhaseColor,
  type Program,
  type ProgramWorkoutExercise,
} from "@/lib/program";
import { C, DISPLAY, styles } from "@/lib/styles";
import {
  addBtnStyle,
  cancelBtn,
  chipBtn,
  confirmSmallBtn,
  CopyWorkoutButton,
  inputStyle,
  MuscleGroupPicker,
  NewProgramForm,
  SectionHeader,
  smallDangerBtn,
  UNIT_LABEL,
} from "./programShared";

const COLOR_OPTIONS: PhaseColor[] = ["accent", "green", "blue", "red"];

export default function ProgramEditor({
  supabase,
  program,
  library,
  history,
  target,
  programSeq,
  onBack,
  onChanged,
  startWithCreateForm = false,
}: {
  supabase: SupabaseClient;
  program: Program | null;
  library: LibraryExercise[];
  history: HistoryEntry[];
  target: "active" | "scheduled";
  programSeq: Map<string, number>;
  onBack: () => void;
  onChanged: () => Promise<void>;
  startWithCreateForm?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [showReplaceForm, setShowReplaceForm] = useState(startWithCreateForm);
  const [addingToWorkout, setAddingToWorkout] = useState<string | null>(null);
  const [showNewPhase, setShowNewPhase] = useState(false);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    try {
      await fn();
      await onChanged();
    } finally {
      setBusy(false);
    }
  }

  const isScheduled = target === "scheduled";
  const title = isScheduled ? "Próximo Programa" : "Programa Atual";

  return (
    <div style={{ animation: "tabScreenIn .45s cubic-bezier(.2,.8,.2,1) both" }}>
      <div style={styles.topNav}>
        <button onClick={onBack} style={styles.backBtn}>← Programas</button>
      </div>
      <div style={{ ...styles.histBody, paddingBottom: 40 }}>
        <h2 style={styles.histTitle}>{title}</h2>

        {program && !showReplaceForm && (
          <ProgramFields
            supabase={supabase}
            program={program}
            library={library}
            history={history}
            seq={programSeq.get(program.id) ?? 0}
            busy={busy}
            run={run}
            addingToWorkout={addingToWorkout}
            setAddingToWorkout={setAddingToWorkout}
            showNewPhase={showNewPhase}
            setShowNewPhase={setShowNewPhase}
            isScheduled={isScheduled}
            onStartNewProgram={() => setShowReplaceForm(true)}
            onDeleteScheduled={() =>
              run(async () => {
                await deleteProgram(supabase, program.id);
              })
            }
          />
        )}

        {(!program || showReplaceForm) && (
          <NewProgramForm
            busy={busy}
            hasExisting={!!program}
            scheduling={isScheduled}
            onCancel={() => setShowReplaceForm(false)}
            onCreate={(input) =>
              run(async () => {
                if (isScheduled) {
                  await scheduleNextProgram(supabase, { name: input.name, weeks: input.weeks, restSeconds: input.restSeconds });
                } else {
                  await createProgram(supabase, input);
                }
                setShowReplaceForm(false);
              })
            }
          />
        )}
      </div>
    </div>
  );
}

function ProgramFields({
  supabase,
  program,
  library,
  history,
  seq,
  busy,
  run,
  addingToWorkout,
  setAddingToWorkout,
  showNewPhase,
  setShowNewPhase,
  isScheduled,
  onStartNewProgram,
  onDeleteScheduled,
}: {
  supabase: SupabaseClient;
  program: Program;
  library: LibraryExercise[];
  history: HistoryEntry[];
  seq: number;
  busy: boolean;
  run: (fn: () => Promise<void>) => Promise<void>;
  addingToWorkout: string | null;
  setAddingToWorkout: (id: string | null) => void;
  showNewPhase: boolean;
  setShowNewPhase: (v: boolean) => void;
  isScheduled: boolean;
  onStartNewProgram: () => void;
  onDeleteScheduled: () => void;
}) {
  const week = getCurrentWeek(program, history);
  const [newWorkoutName, setNewWorkoutName] = useState("");
  const [newWorkoutEmoji, setNewWorkoutEmoji] = useState("💪");

  return (
    <div>
      <div style={{ background: C.bgCard, border: `1px solid ${C.bgHeader}`, borderRadius: 16, padding: "18px 18px 16px", marginBottom: 24 }}>
        <div style={{ fontFamily: DISPLAY, fontSize: 18, fontWeight: 700 }}>{program.name}</div>
        <div style={{ fontSize: 12, color: C.midGray, marginTop: 4 }}>
          {isScheduled
            ? `${program.weeks} semanas · descanso ${program.restSeconds}s · começa quando o atual terminar`
            : `Semana ${week} de ${program.weeks} · início ${formatDateDisplay(program.startDate)} · descanso ${program.restSeconds}s`}
        </div>
      </div>

      <SectionHeader title="Treinos (ordem de rotação)" />
      <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 20 }}>
        {program.workouts.map((w) => (
          <div key={w.id} style={{ background: C.bgCard, border: `1px solid ${C.bgHeader}`, borderRadius: 14, padding: "14px 14px 12px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 700, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{w.emoji} {w.name}</span>
              <span style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                <CopyWorkoutButton seq={seq} workout={w} />
                <button
                  disabled={busy}
                  onClick={() => run(() => deleteProgramWorkout(supabase, w.id))}
                  style={smallDangerBtn}
                >
                  remover
                </button>
              </span>
            </div>
            <ReorderableExerciseList
              exercises={w.exercises}
              busy={busy}
              onDelete={(exId) => run(() => deleteProgramWorkoutExercise(supabase, exId))}
              onReorder={(orderedIds) => run(() => reorderProgramWorkoutExercises(supabase, orderedIds))}
              onEdit={(exId, input) => run(() => updateProgramWorkoutExercise(supabase, exId, input))}
            />
            {addingToWorkout === w.id ? (
              <AddExerciseForm
                supabase={supabase}
                busy={busy}
                run={run}
                library={library}
                onCancel={() => setAddingToWorkout(null)}
                onAdd={(input) =>
                  run(async () => {
                    await addProgramWorkoutExercise(supabase, w.id, { ...input, orderIndex: w.exercises.length });
                    setAddingToWorkout(null);
                  })
                }
              />
            ) : (
              <button onClick={() => setAddingToWorkout(w.id)} style={{ ...addBtnStyle, marginTop: 10 }}>+ Adicionar exercício</button>
            )}
          </div>
        ))}

        <div style={{ background: C.bgCard, border: `1px dashed ${C.bgHeader}`, borderRadius: 14, padding: 14, display: "flex", gap: 8 }}>
          <input placeholder="Emoji" value={newWorkoutEmoji} onChange={(e) => setNewWorkoutEmoji(e.target.value)} style={{ ...inputStyle, width: 48, textAlign: "center", flexShrink: 0 }} />
          <input placeholder="Nome do treino (ex: Treino C)" value={newWorkoutName} onChange={(e) => setNewWorkoutName(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
          <button
            disabled={busy || !newWorkoutName.trim()}
            onClick={() =>
              run(async () => {
                await addProgramWorkout(supabase, program.id, { name: newWorkoutName.trim(), emoji: newWorkoutEmoji || "💪", orderIndex: program.workouts.length });
                setNewWorkoutName("");
              })
            }
            style={confirmSmallBtn}
          >
            + Treino
          </button>
        </div>
      </div>

      <SectionHeader title="Fases do programa" />
      <div style={{ display: "flex", flexDirection: "column", gap: 0, marginBottom: 10 }}>
        {program.phases.map((p) => {
          const isActivePhase = !isScheduled && week >= p.startWeek && week <= p.endWeek;
          return (
            <div key={p.id} style={{ ...styles.phaseCard, ...(isActivePhase ? styles.phaseCardActive : null) }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={styles.phaseName}>{p.name}</span>
                  {isActivePhase && (
                    <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.5, background: C.accent, color: "#0A0A0B", padding: "2px 7px", borderRadius: 6 }}>ATIVA</span>
                  )}
                </span>
                <button disabled={busy} onClick={() => run(() => deleteProgramPhase(supabase, p.id))} style={smallDangerBtn}>×</button>
              </div>
              <div style={styles.phaseWeeksRow}>
                {Array.from({ length: p.endWeek - p.startWeek + 1 }).map((_, i) => (
                  <div key={i} style={{ ...styles.phaseWeek, ...(p.startWeek + i <= week && !isScheduled ? styles.phaseWeekDone : null) }} />
                ))}
              </div>
              <span style={styles.phaseMeta}>{p.description || `Semanas ${p.startWeek}–${p.endWeek}`}</span>
            </div>
          );
        })}
        {program.phases.length === 0 && <div style={{ fontSize: 12, color: C.midGray, marginBottom: 10 }}>Nenhuma fase definida.</div>}
      </div>
      {showNewPhase ? (
        <NewPhaseForm
          busy={busy}
          onCancel={() => setShowNewPhase(false)}
          onCreate={(input) =>
            run(async () => {
              await addProgramPhase(supabase, program.id, { ...input, orderIndex: program.phases.length });
              setShowNewPhase(false);
            })
          }
        />
      ) : (
        <button onClick={() => setShowNewPhase(true)} style={addBtnStyle}>+ Nova fase</button>
      )}

      <button
        disabled={busy}
        onClick={isScheduled ? onDeleteScheduled : onStartNewProgram}
        style={{ display: "block", width: "100%", marginTop: 30, background: "transparent", border: `1px solid #4A2233`, color: C.red, borderRadius: 12, padding: "13px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
      >
        {isScheduled ? "Remover programa agendado" : "Concluir este programa e criar um novo"}
      </button>
    </div>
  );
}

function ReorderableExerciseList({
  exercises,
  busy,
  onDelete,
  onReorder,
  onEdit,
}: {
  exercises: ProgramWorkoutExercise[];
  busy: boolean;
  onDelete: (id: string) => void;
  onReorder: (orderedIds: string[]) => void;
  onEdit: (id: string, input: { sets: number; reps: string; holdSeconds: number | null; restSeconds: number | null; notes: string | null }) => void;
}) {
  const [order, setOrder] = useState(() => exercises.map((e) => e.id));
  const [dragId, setDragId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const orderRef = useRef(order);
  const dragIdRef = useRef<string | null>(null);
  const draggingRef = useRef(false);
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (!draggingRef.current) {
      const next = exercises.map((e) => e.id);
      orderRef.current = next;
      setOrder(next);
    }
  }, [exercises]);

  function startDrag(id: string) {
    if (busy) return;
    dragIdRef.current = id;
    draggingRef.current = true;
    setDragId(id);

    const onMove = (e: PointerEvent) => {
      const dragging = dragIdRef.current;
      if (!dragging) return;
      const current = orderRef.current;
      const currentIdx = current.indexOf(dragging);
      const y = e.clientY;
      for (let i = 0; i < current.length; i++) {
        if (current[i] === dragging) continue;
        const el = itemRefs.current[current[i]];
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        const mid = rect.top + rect.height / 2;
        if ((i < currentIdx && y < mid) || (i > currentIdx && y > mid)) {
          const next = current.filter((x) => x !== dragging);
          next.splice(i, 0, dragging);
          orderRef.current = next;
          setOrder(next);
          break;
        }
      }
    };

    const onUp = () => {
      const dragging = dragIdRef.current;
      if (dragging) onReorder(orderRef.current);
      dragIdRef.current = null;
      draggingRef.current = false;
      setDragId(null);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  const byId = new Map(exercises.map((e) => [e.id, e]));

  return (
    <div>
      {order.map((id) => {
        const ex = byId.get(id);
        if (!ex) return null;
        const isDragging = dragId === id;
        return (
          <div
            key={id}
            ref={(el) => {
              itemRefs.current[id] = el;
            }}
            style={{
              borderTop: `1px solid ${C.line}`,
              background: isDragging ? "rgba(255,255,255,.05)" : "transparent",
              opacity: isDragging ? 0.7 : 1,
              touchAction: isDragging ? "none" : "auto",
            }}
          >
            <div
              onClick={() => setExpandedId(expandedId === id ? null : id)}
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", cursor: "pointer" }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                <span
                  onPointerDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    startDrag(id);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  style={{ fontSize: 14, color: "#4E4E48", cursor: "grab", touchAction: "none", padding: "4px 2px" }}
                >
                  ⠿
                </span>
                <span style={{ fontSize: 12.5 }}>{ex.name}</span>
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                <span style={{ fontSize: 11, color: C.midGray }}>{ex.holdSeconds ? `${ex.sets}×${ex.holdSeconds}s` : `${ex.sets}×${ex.reps}`}</span>
                <button disabled={busy} onClick={(e) => { e.stopPropagation(); onDelete(ex.id); }} style={smallDangerBtn}>×</button>
              </span>
            </div>
            {expandedId === id && (
              <ExerciseEditFields
                exercise={ex}
                busy={busy}
                onSave={(input) => {
                  onEdit(ex.id, input);
                  setExpandedId(null);
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function ExerciseEditFields({
  exercise,
  busy,
  onSave,
}: {
  exercise: ProgramWorkoutExercise;
  busy: boolean;
  onSave: (input: { sets: number; reps: string; holdSeconds: number | null; restSeconds: number | null; notes: string | null }) => void;
}) {
  const [sets, setSets] = useState(String(exercise.sets));
  const [reps, setReps] = useState(exercise.reps);
  const [holdSeconds, setHoldSeconds] = useState(exercise.holdSeconds ? String(exercise.holdSeconds) : "");
  const [restSeconds, setRestSeconds] = useState(exercise.restSeconds ? String(exercise.restSeconds) : "");
  const [notes, setNotes] = useState(exercise.notes ?? "");
  const isTimed = exercise.holdSeconds != null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "0 0 12px" }} onClick={(e) => e.stopPropagation()}>
      <div style={{ display: "flex", gap: 8 }}>
        <div style={numFieldStyle}>
          <span style={numFieldLabelStyle}>SÉRIES</span>
          <input type="number" value={sets} onChange={(e) => setSets(e.target.value)} style={numFieldValueStyle} />
        </div>
        <div style={numFieldStyle}>
          <span style={numFieldLabelStyle}>{isTimed ? "SEGUNDOS" : "REPS"}</span>
          <input value={isTimed ? holdSeconds : reps} onChange={(e) => (isTimed ? setHoldSeconds(e.target.value) : setReps(e.target.value))} style={numFieldValueStyle} />
        </div>
        <div style={numFieldStyle}>
          <span style={numFieldLabelStyle}>DESC. (S)</span>
          <input type="number" placeholder="—" value={restSeconds} onChange={(e) => setRestSeconds(e.target.value)} style={numFieldValueStyle} />
        </div>
      </div>
      <input
        placeholder="Observação (opcional, ex: cuidado com o joelho)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        style={inputStyle}
      />
      <button
        disabled={busy}
        onClick={() =>
          onSave({
            sets: Number(sets) || 1,
            reps: isTimed ? exercise.reps : reps,
            holdSeconds: isTimed ? Number(holdSeconds) || exercise.holdSeconds : null,
            restSeconds: restSeconds.trim() ? Number(restSeconds) : null,
            notes: notes.trim() || null,
          })
        }
        style={confirmSmallBtn}
      >
        Salvar
      </button>
    </div>
  );
}

const numFieldStyle: React.CSSProperties = {
  flex: 1,
  padding: "9px 10px",
  background: "rgba(255,255,255,.05)",
  border: "1px solid rgba(255,255,255,.09)",
  borderRadius: 10,
  display: "flex",
  flexDirection: "column",
  gap: 2,
};
const numFieldLabelStyle: React.CSSProperties = { fontSize: 8.5, letterSpacing: 1, color: "#8A8A82" };
const numFieldValueStyle: React.CSSProperties = { fontSize: 13, fontWeight: 600, background: "transparent", border: "none", color: "#F2F2EE", outline: "none", width: "100%", padding: 0 };

function AddExerciseForm({
  supabase,
  busy,
  run,
  library,
  onCancel,
  onAdd,
}: {
  supabase: SupabaseClient;
  busy: boolean;
  run: (fn: () => Promise<void>) => Promise<void>;
  library: LibraryExercise[];
  onCancel: () => void;
  onAdd: (input: { exerciseId: string; sets: number; reps: string; holdSeconds: number | null }) => void;
}) {
  const [query, setQuery] = useState("");
  const [exerciseId, setExerciseId] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [sets, setSets] = useState("3");
  const [reps, setReps] = useState("10-12");

  const selected = library.find((e) => e.id === exerciseId) ?? null;
  const q = query.trim().toLowerCase();
  const matches = (q ? library.filter((e) => e.name.toLowerCase().includes(q)) : library).slice(0, 6);

  function pick(ex: LibraryExercise) {
    setExerciseId(ex.id);
    setQuery(ex.name);
    setShowResults(false);
  }

  return (
    <div style={{ marginTop: 10, padding: 10, background: C.bgPage, borderRadius: 10, display: "flex", flexDirection: "column", gap: 8 }}>
      {showCreateForm ? (
        <InlineExerciseCreateForm
          busy={busy}
          initialName={query}
          onCancel={() => setShowCreateForm(false)}
          onCreate={(input) =>
            run(async () => {
              const created = await addLibraryExercise(supabase, input);
              setExerciseId(created.id);
              setQuery(created.name);
              setShowCreateForm(false);
            })
          }
        />
      ) : (
        <div style={{ position: "relative" }}>
          <input
            placeholder="Buscar ou digitar novo exercício..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setExerciseId(null);
              setShowResults(true);
            }}
            onFocus={() => setShowResults(true)}
            onBlur={() => setTimeout(() => setShowResults(false), 150)}
            style={inputStyle}
          />
          {showResults && (
            <div
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                right: 0,
                zIndex: 10,
                background: C.bgDark,
                border: `1px solid ${C.bgHeader}`,
                borderRadius: 10,
                marginTop: 4,
                maxHeight: 200,
                overflowY: "auto",
              }}
            >
              {matches.map((ex) => (
                <button
                  key={ex.id}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(ex)}
                  style={{ display: "block", width: "100%", textAlign: "left", padding: "9px 12px", background: "transparent", border: "none", color: C.white, fontSize: 12.5, cursor: "pointer" }}
                >
                  {ex.name}
                </button>
              ))}
              {matches.length === 0 && (
                <div style={{ padding: "9px 12px", fontSize: 12, color: C.midGray }}>Nenhum exercício encontrado.</div>
              )}
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setShowCreateForm(true)}
                style={{ display: "block", width: "100%", textAlign: "left", padding: "9px 12px", background: "transparent", border: "none", borderTop: `1px solid ${C.bgHeader}`, color: C.accent, fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}
              >
                {`+ Criar novo exercício${query.trim() ? ` "${query.trim()}"` : ""}`}
              </button>
            </div>
          )}
        </div>
      )}

      {selected && !showCreateForm && (
        <div style={{ display: "flex", gap: 8 }}>
          <input type="number" placeholder="Séries" value={sets} onChange={(e) => setSets(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
          <input placeholder={selected.holdSeconds ? "Segundos" : "Reps (ex: 8-12)"} value={reps} onChange={(e) => setReps(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
        </div>
      )}
      {!showCreateForm && (
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onCancel} style={cancelBtn}>Cancelar</button>
          <button
            disabled={busy || !selected || !sets}
            onClick={() =>
              selected &&
              onAdd({
                exerciseId: selected.id,
                sets: Number(sets) || 1,
                reps,
                holdSeconds: selected.holdSeconds ?? null,
              })
            }
            style={{ ...confirmSmallBtn, flex: 1 }}
          >
            Adicionar
          </button>
        </div>
      )}
    </div>
  );
}

function InlineExerciseCreateForm({
  busy,
  initialName,
  onCancel,
  onCreate,
}: {
  busy: boolean;
  initialName: string;
  onCancel: () => void;
  onCreate: (input: { name: string; unit: ExerciseUnit; holdSeconds: number | null; muscleGroup: MuscleGroup | null }) => void;
}) {
  const [name, setName] = useState(initialName);
  const [unit, setUnit] = useState<ExerciseUnit>("total");
  const [muscleGroup, setMuscleGroup] = useState<MuscleGroup | null>(null);
  const [isTimed, setIsTimed] = useState(false);
  const [seconds, setSeconds] = useState("30");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ fontSize: 11.5, color: C.midGray, fontWeight: 600 }}>NOVO EXERCÍCIO</div>
      <input placeholder="Nome do exercício" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} autoFocus />
      <div style={{ display: "flex", gap: 8 }}>
        {(["total", "halter", "corpo"] as ExerciseUnit[]).map((u) => (
          <button key={u} onClick={() => setUnit(u)} style={{ ...chipBtn, borderColor: unit === u ? C.accent : C.bgHeader, color: unit === u ? C.accent : C.lightGray }}>
            {UNIT_LABEL[u]}
          </button>
        ))}
      </div>
      <MuscleGroupPicker value={muscleGroup} onChange={setMuscleGroup} />
      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: C.lightGray }}>
        <input type="checkbox" checked={isTimed} onChange={(e) => setIsTimed(e.target.checked)} />
        É por tempo (ex: prancha)
      </label>
      {isTimed && (
        <input type="number" placeholder="Segundos" value={seconds} onChange={(e) => setSeconds(e.target.value)} style={inputStyle} />
      )}
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={onCancel} style={cancelBtn}>Cancelar</button>
        <button
          disabled={busy || !name.trim()}
          onClick={() => onCreate({ name: name.trim(), unit, holdSeconds: isTimed ? Number(seconds) || 30 : null, muscleGroup })}
          style={{ ...confirmSmallBtn, flex: 1 }}
        >
          Criar e selecionar
        </button>
      </div>
    </div>
  );
}

function NewPhaseForm({
  busy,
  onCancel,
  onCreate,
}: {
  busy: boolean;
  onCancel: () => void;
  onCreate: (input: { name: string; description: string; startWeek: number; endWeek: number; color: PhaseColor }) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startWeek, setStartWeek] = useState("1");
  const [endWeek, setEndWeek] = useState("2");
  const [color, setColor] = useState<PhaseColor>("accent");

  return (
    <div style={{ background: C.bgCard, border: `1px solid ${C.bgHeader}`, borderRadius: 14, padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
      <input placeholder="Nome da fase (ex: Adaptação)" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
      <input placeholder="Descrição (opcional)" value={description} onChange={(e) => setDescription(e.target.value)} style={inputStyle} />
      <div style={{ display: "flex", gap: 8 }}>
        <input type="number" placeholder="Semana inicial" value={startWeek} onChange={(e) => setStartWeek(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
        <input type="number" placeholder="Semana final" value={endWeek} onChange={(e) => setEndWeek(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        {COLOR_OPTIONS.map((c) => (
          <button key={c} onClick={() => setColor(c)} style={{ width: 30, height: 30, borderRadius: 8, background: PHASE_COLOR_HEX[c], border: color === c ? `2px solid ${C.white}` : "2px solid transparent", cursor: "pointer" }} />
        ))}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={onCancel} style={cancelBtn}>Cancelar</button>
        <button
          disabled={busy || !name.trim()}
          onClick={() => onCreate({ name: name.trim(), description, startWeek: Number(startWeek) || 1, endWeek: Number(endWeek) || 1, color })}
          style={{ ...confirmSmallBtn, flex: 1 }}
        >
          Adicionar fase
        </button>
      </div>
    </div>
  );
}
