"use client";

import { useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  addLibraryExercise,
  addProgramPhase,
  addProgramWorkout,
  addProgramWorkoutExercise,
  createProgram,
  deleteProgramPhase,
  deleteProgramWorkout,
  deleteProgramWorkoutExercise,
} from "@/lib/data";
import {
  formatDate,
  formatDateDisplay,
  getCurrentWeek,
  PHASE_COLOR_HEX,
  type ExerciseUnit,
  type LibraryExercise,
  type PhaseColor,
  type Program,
} from "@/lib/program";
import { C, DISPLAY, styles } from "@/lib/styles";

const UNIT_LABEL: Record<ExerciseUnit, string> = {
  total: "Peso total",
  halter: "Por halter",
  corpo: "Peso do corpo",
};

const COLOR_OPTIONS: PhaseColor[] = ["accent", "green", "blue", "red"];

export default function ProgramManager({
  supabase,
  program,
  library,
  onBack,
  onChanged,
}: {
  supabase: SupabaseClient;
  program: Program | null;
  library: LibraryExercise[];
  onBack: () => void;
  onChanged: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [showNewProgram, setShowNewProgram] = useState(!program);
  const [showNewExercise, setShowNewExercise] = useState(false);
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

  return (
    <div style={{ animation: "tabScreenIn .45s cubic-bezier(.2,.8,.2,1) both" }}>
      <div style={styles.topNav}>
        <button onClick={onBack} style={styles.backBtn}>← Início</button>
      </div>
      <div style={{ ...styles.histBody, paddingBottom: 40 }}>
        <h2 style={styles.histTitle}>Programa</h2>

        {program && !showNewProgram && (
          <ProgramSection
            supabase={supabase}
            program={program}
            library={library}
            busy={busy}
            run={run}
            addingToWorkout={addingToWorkout}
            setAddingToWorkout={setAddingToWorkout}
            showNewPhase={showNewPhase}
            setShowNewPhase={setShowNewPhase}
            onStartNewProgram={() => setShowNewProgram(true)}
          />
        )}

        {showNewProgram && (
          <NewProgramForm
            busy={busy}
            hasExisting={!!program}
            onCancel={() => setShowNewProgram(false)}
            onCreate={(input) =>
              run(async () => {
                await createProgram(supabase, input);
                setShowNewProgram(false);
              })
            }
          />
        )}

        <div style={{ marginTop: 34 }}>
          <SectionHeader title="Biblioteca de Exercícios" />
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
            {library.map((ex) => (
              <div key={ex.id} style={libRowStyle}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{ex.name}</span>
                <span style={{ fontSize: 10.5, color: C.midGray }}>
                  {UNIT_LABEL[ex.unit]}
                  {ex.holdSeconds ? ` · ${ex.holdSeconds}s` : ""}
                </span>
              </div>
            ))}
            {library.length === 0 && <div style={{ fontSize: 12, color: C.midGray }}>Nenhum exercício ainda.</div>}
          </div>
          {showNewExercise ? (
            <NewExerciseForm
              busy={busy}
              onCancel={() => setShowNewExercise(false)}
              onCreate={(input) =>
                run(async () => {
                  await addLibraryExercise(supabase, input);
                  setShowNewExercise(false);
                })
              }
            />
          ) : (
            <button onClick={() => setShowNewExercise(true)} style={addBtnStyle}>+ Novo exercício</button>
          )}
        </div>
      </div>
    </div>
  );
}

function ProgramSection({
  supabase,
  program,
  library,
  busy,
  run,
  addingToWorkout,
  setAddingToWorkout,
  showNewPhase,
  setShowNewPhase,
  onStartNewProgram,
}: {
  supabase: SupabaseClient;
  program: Program;
  library: LibraryExercise[];
  busy: boolean;
  run: (fn: () => Promise<void>) => Promise<void>;
  addingToWorkout: string | null;
  setAddingToWorkout: (id: string | null) => void;
  showNewPhase: boolean;
  setShowNewPhase: (v: boolean) => void;
  onStartNewProgram: () => void;
}) {
  const week = getCurrentWeek(program);
  const [newWorkoutName, setNewWorkoutName] = useState("");
  const [newWorkoutEmoji, setNewWorkoutEmoji] = useState("💪");

  return (
    <div>
      <div style={{ background: C.bgCard, border: `1px solid ${C.bgHeader}`, borderRadius: 16, padding: "18px 18px 16px", marginBottom: 24 }}>
        <div style={{ fontFamily: DISPLAY, fontSize: 18, fontWeight: 700 }}>{program.name}</div>
        <div style={{ fontSize: 12, color: C.midGray, marginTop: 4 }}>
          Semana {week} de {program.weeks} · início {formatDateDisplay(program.startDate)} · descanso {program.restSeconds}s
        </div>
      </div>

      <SectionHeader title="Treinos (ordem de rotação)" />
      <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 20 }}>
        {program.workouts.map((w) => (
          <div key={w.id} style={{ background: C.bgCard, border: `1px solid ${C.bgHeader}`, borderRadius: 14, padding: "14px 14px 12px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 700 }}>{w.emoji} {w.name}</span>
              <button
                disabled={busy}
                onClick={() => run(() => deleteProgramWorkout(supabase, w.id))}
                style={smallDangerBtn}
              >
                remover
              </button>
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
        onClick={onStartNewProgram}
        style={{ display: "block", width: "100%", marginTop: 30, background: "transparent", border: `1px solid #4A2233`, color: C.red, borderRadius: 12, padding: "13px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
      >
        Concluir este programa e criar um novo
      </button>
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.2, color: C.midGray, marginBottom: 10 }}>{title.toUpperCase()}</div>;
}

function NewProgramForm({
  busy,
  hasExisting,
  onCancel,
  onCreate,
}: {
  busy: boolean;
  hasExisting: boolean;
  onCancel: () => void;
  onCreate: (input: { name: string; startDate: string; weeks: number; restSeconds: number }) => void;
}) {
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState(formatDate(new Date()));
  const [weeks, setWeeks] = useState("4");
  const [restSeconds, setRestSeconds] = useState("90");

  return (
    <div style={{ background: C.bgCard, border: `1px solid ${C.accent}`, borderRadius: 16, padding: 16, marginBottom: 24, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontSize: 13, fontWeight: 700 }}>Novo programa</div>
      <input placeholder="Nome do programa" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
      <label style={labelStyle}>Data de início
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={inputStyle} />
      </label>
      <label style={labelStyle}>Duração (semanas)
        <input type="number" value={weeks} onChange={(e) => setWeeks(e.target.value)} style={inputStyle} />
      </label>
      <label style={labelStyle}>Descanso entre séries (segundos)
        <input type="number" value={restSeconds} onChange={(e) => setRestSeconds(e.target.value)} style={inputStyle} />
      </label>
      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
        {hasExisting && <button onClick={onCancel} style={cancelBtn}>Cancelar</button>}
        <button
          disabled={busy || !name.trim() || !weeks || !restSeconds}
          onClick={() => onCreate({ name: name.trim(), startDate, weeks: Number(weeks), restSeconds: Number(restSeconds) })}
          style={{ ...confirmSmallBtn, flex: 1 }}
        >
          Criar programa
        </button>
      </div>
    </div>
  );
}

function NewExerciseForm({
  busy,
  onCancel,
  onCreate,
}: {
  busy: boolean;
  onCancel: () => void;
  onCreate: (input: { name: string; unit: ExerciseUnit; holdSeconds: number | null }) => void;
}) {
  const [name, setName] = useState("");
  const [unit, setUnit] = useState<ExerciseUnit>("total");
  const [isTimed, setIsTimed] = useState(false);
  const [seconds, setSeconds] = useState("30");

  return (
    <div style={{ background: C.bgCard, border: `1px solid ${C.bgHeader}`, borderRadius: 14, padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
      <input placeholder="Nome do exercício" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
      <div style={{ display: "flex", gap: 8 }}>
        {(["total", "halter", "corpo"] as ExerciseUnit[]).map((u) => (
          <button key={u} onClick={() => setUnit(u)} style={{ ...chipBtn, borderColor: unit === u ? C.accent : C.bgHeader, color: unit === u ? C.accent : C.lightGray }}>
            {UNIT_LABEL[u]}
          </button>
        ))}
      </div>
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
          onClick={() => onCreate({ name: name.trim(), unit, holdSeconds: isTimed ? Number(seconds) || 30 : null })}
          style={{ ...confirmSmallBtn, flex: 1 }}
        >
          Adicionar
        </button>
      </div>
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

const inputStyle: React.CSSProperties = {
  background: C.bgPage,
  border: `1px solid ${C.bgHeader}`,
  borderRadius: 10,
  padding: "10px 12px",
  color: C.white,
  fontSize: 13,
  outline: "none",
  width: "100%",
};

const labelStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  fontSize: 11.5,
  color: C.lightGray,
  fontWeight: 600,
};

const addBtnStyle: React.CSSProperties = {
  background: "transparent",
  border: `1px dashed ${C.bgHeader}`,
  color: C.accent,
  borderRadius: 10,
  padding: "10px 14px",
  fontSize: 12.5,
  fontWeight: 600,
  cursor: "pointer",
  width: "100%",
};

const confirmSmallBtn: React.CSSProperties = {
  background: C.accent,
  color: C.bgDark,
  border: "none",
  borderRadius: 10,
  padding: "10px 14px",
  fontSize: 12.5,
  fontWeight: 700,
  cursor: "pointer",
};

const cancelBtn: React.CSSProperties = {
  background: "transparent",
  border: `1px solid ${C.bgHeader}`,
  color: C.lightGray,
  borderRadius: 10,
  padding: "10px 14px",
  fontSize: 12.5,
  fontWeight: 600,
  cursor: "pointer",
};

const smallDangerBtn: React.CSSProperties = {
  background: "transparent",
  border: "none",
  color: C.red,
  fontSize: 11,
  fontWeight: 700,
  cursor: "pointer",
  padding: "2px 4px",
};

const chipBtn: React.CSSProperties = {
  flex: 1,
  padding: "8px 6px",
  borderRadius: 8,
  fontSize: 11,
  fontWeight: 600,
  background: "transparent",
  border: "1px solid",
  cursor: "pointer",
};

const libRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  background: C.bgCard,
  border: `1px solid ${C.bgHeader}`,
  borderRadius: 10,
  padding: "10px 12px",
};
