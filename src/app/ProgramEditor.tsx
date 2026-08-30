"use client";

import { useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  addProgramPhase,
  addProgramWorkout,
  addProgramWorkoutExercise,
  createProgram,
  deleteProgram,
  deleteProgramPhase,
  deleteProgramWorkout,
  deleteProgramWorkoutExercise,
  scheduleNextProgram,
} from "@/lib/data";
import {
  formatDateDisplay,
  getCurrentWeek,
  PHASE_COLOR_HEX,
  type HistoryEntry,
  type LibraryExercise,
  type PhaseColor,
  type Program,
} from "@/lib/program";
import { C, DISPLAY, styles } from "@/lib/styles";
import {
  addBtnStyle,
  cancelBtn,
  confirmSmallBtn,
  CopyWorkoutButton,
  inputStyle,
  libRowStyle,
  NewProgramForm,
  SectionHeader,
  smallDangerBtn,
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
            {w.exercises.map((ex) => (
              <div key={ex.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderTop: `1px solid ${C.line}` }}>
                <span style={{ fontSize: 12.5 }}>{ex.name}</span>
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 11, color: C.midGray }}>{ex.sets}×{ex.reps}</span>
                  <button disabled={busy} onClick={() => run(() => deleteProgramWorkoutExercise(supabase, ex.id))} style={smallDangerBtn}>×</button>
                </span>
              </div>
            ))}
            {addingToWorkout === w.id ? (
              <AddExerciseForm
                busy={busy}
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
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
        {program.phases.map((p) => (
          <div key={p.id} style={libRowStyle}>
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: 4, background: PHASE_COLOR_HEX[p.color] }} />
              <span style={{ fontSize: 13, fontWeight: 600 }}>{p.name}</span>
              <span style={{ fontSize: 11, color: C.midGray }}>sem. {p.startWeek}–{p.endWeek}</span>
            </span>
            <button disabled={busy} onClick={() => run(() => deleteProgramPhase(supabase, p.id))} style={smallDangerBtn}>×</button>
          </div>
        ))}
        {program.phases.length === 0 && <div style={{ fontSize: 12, color: C.midGray }}>Nenhuma fase definida.</div>}
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

function AddExerciseForm({
  busy,
  library,
  onCancel,
  onAdd,
}: {
  busy: boolean;
  library: LibraryExercise[];
  onCancel: () => void;
  onAdd: (input: { exerciseId: string; sets: number; reps: string; holdSeconds: number | null }) => void;
}) {
  const [exerciseId, setExerciseId] = useState(library[0]?.id ?? "");
  const [sets, setSets] = useState("3");
  const [reps, setReps] = useState("10-12");

  const selected = library.find((e) => e.id === exerciseId);

  return (
    <div style={{ marginTop: 10, padding: 10, background: C.bgPage, borderRadius: 10, display: "flex", flexDirection: "column", gap: 8 }}>
      <select value={exerciseId} onChange={(e) => setExerciseId(e.target.value)} style={inputStyle}>
        {library.map((ex) => (
          <option key={ex.id} value={ex.id}>{ex.name}</option>
        ))}
      </select>
      <div style={{ display: "flex", gap: 8 }}>
        <input type="number" placeholder="Séries" value={sets} onChange={(e) => setSets(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
        <input placeholder={selected?.holdSeconds ? "Segundos" : "Reps (ex: 8-12)"} value={reps} onChange={(e) => setReps(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={onCancel} style={cancelBtn}>Cancelar</button>
        <button
          disabled={busy || !exerciseId || !sets}
          onClick={() =>
            onAdd({
              exerciseId,
              sets: Number(sets) || 1,
              reps,
              holdSeconds: selected?.holdSeconds ?? null,
            })
          }
          style={{ ...confirmSmallBtn, flex: 1 }}
        >
          Adicionar
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
