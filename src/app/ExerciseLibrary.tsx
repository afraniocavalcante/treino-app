"use client";

import { useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { addLibraryExercise, uploadExerciseGif } from "@/lib/data";
import { MUSCLE_GROUPS, type ExerciseUnit, type LibraryExercise, type MuscleGroup } from "@/lib/program";
import { C, styles } from "@/lib/styles";
import { addBtnStyle, cancelBtn, chipBtn, confirmSmallBtn, inputStyle, libRowStyle, MuscleGroupPicker, UNIT_LABEL } from "./programShared";

export default function ExerciseLibrary({
  supabase,
  library,
  onBack,
  onChanged,
}: {
  supabase: SupabaseClient;
  library: LibraryExercise[];
  onBack: () => void;
  onChanged: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [showNewExercise, setShowNewExercise] = useState(false);
  const [query, setQuery] = useState("");
  const [groupFilter, setGroupFilter] = useState<MuscleGroup | null>(null);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    try {
      await fn();
      await onChanged();
    } finally {
      setBusy(false);
    }
  }

  const q = query.trim().toLowerCase();
  const filtered = library.filter((ex) => {
    if (groupFilter && ex.muscleGroup !== groupFilter) return false;
    if (q && !ex.name.toLowerCase().includes(q)) return false;
    return true;
  });
  const groupsInUse = MUSCLE_GROUPS.filter((g) => library.some((ex) => ex.muscleGroup === g));

  return (
    <div style={{ animation: "tabScreenIn .45s cubic-bezier(.2,.8,.2,1) both" }}>
      <div style={styles.topNav}>
        <button onClick={onBack} style={styles.backBtn}>← Programas</button>
      </div>
      <div style={{ ...styles.histBody, paddingBottom: 40 }}>
        <h2 style={styles.histTitle}>Biblioteca de Exercícios</h2>
        <input
          placeholder="Buscar exercício..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ ...styles.searchField, marginBottom: 12 }}
        />
        {groupsInUse.length > 0 && (
          <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, marginBottom: 16 }}>
            <button
              onClick={() => setGroupFilter(null)}
              style={{ ...styles.filterChip, ...(groupFilter === null ? styles.filterChipActive : null), flexShrink: 0 }}
            >
              Todos
            </button>
            {groupsInUse.map((g) => (
              <button
                key={g}
                onClick={() => setGroupFilter(g === groupFilter ? null : g)}
                style={{ ...styles.filterChip, ...(groupFilter === g ? styles.filterChipActive : null), flexShrink: 0, whiteSpace: "nowrap" }}
              >
                {g}
              </button>
            ))}
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
          {filtered.map((ex) => (
            <ExerciseLibraryRow key={ex.id} supabase={supabase} exercise={ex} busy={busy} run={run} />
          ))}
          {library.length === 0 && <div style={{ fontSize: 12, color: C.midGray }}>Nenhum exercício ainda.</div>}
          {library.length > 0 && filtered.length === 0 && <div style={{ fontSize: 12, color: C.midGray }}>Nenhum exercício encontrado.</div>}
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
  );
}

function ExerciseLibraryRow({
  supabase,
  exercise,
  busy,
  run,
}: {
  supabase: SupabaseClient;
  exercise: LibraryExercise;
  busy: boolean;
  run: (fn: () => Promise<void>) => Promise<void>;
}) {
  const inputId = `gif-upload-${exercise.id}`;

  return (
    <div style={{ ...libRowStyle, alignItems: "center" }}>
      <span style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        {exercise.gifUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={exercise.gifUrl} alt={exercise.name} style={{ width: 40, height: 40, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
        ) : (
          <span style={{ width: 40, height: 40, borderRadius: 8, background: C.bgHeader, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🎬</span>
        )}
        <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{exercise.name}</span>
          <span style={{ fontSize: 10.5, color: C.midGray }}>
            {exercise.muscleGroup ? `${exercise.muscleGroup} · ` : ""}
            {UNIT_LABEL[exercise.unit]}
            {exercise.holdSeconds ? ` · ${exercise.holdSeconds}s` : ""}
          </span>
        </span>
      </span>
      <label htmlFor={inputId} style={{ fontSize: 10.5, fontWeight: 700, color: C.accent, cursor: busy ? "default" : "pointer", opacity: busy ? 0.5 : 1, flexShrink: 0 }}>
        {exercise.gifUrl ? "trocar gif" : "+ gif"}
      </label>
      <input
        id={inputId}
        type="file"
        accept="image/gif,image/*"
        disabled={busy}
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          run(async () => {
            await uploadExerciseGif(supabase, exercise.id, file);
          });
        }}
      />
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
  onCreate: (input: { name: string; unit: ExerciseUnit; holdSeconds: number | null; muscleGroup: MuscleGroup | null }) => void;
}) {
  const [name, setName] = useState("");
  const [unit, setUnit] = useState<ExerciseUnit>("total");
  const [muscleGroup, setMuscleGroup] = useState<MuscleGroup | null>(null);
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
          Adicionar
        </button>
      </div>
    </div>
  );
}
