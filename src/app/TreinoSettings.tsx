"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  getActiveProgram,
  getCompletedPrograms,
  getExerciseLibrary,
  getHistory,
  getProgramSequence,
  getScheduledProgram,
} from "@/lib/data";
import type { HistoryEntry, LibraryExercise, Program } from "@/lib/program";
import { C, EASE, styles } from "@/lib/styles";
import { loadWithCache, useOnline } from "@/lib/offline";
import ProgramsOverview from "./ProgramsOverview";
import ProgramEditor from "./ProgramEditor";
import ExerciseLibrary from "./ExerciseLibrary";
import { CopyWorkoutButton } from "./programShared";

type Screen = "programs" | "programEditor" | "library" | "completed";

interface TreinoSettingsBundle {
  p: Program | null;
  sp: Program | null;
  lib: LibraryExercise[];
  h: HistoryEntry[];
  cp: Program[];
  seq: [string, number][];
}

/**
 * Configurações de treino — programas ativo/agendado/concluídos e biblioteca de
 * exercícios, movidos para cá de dentro do módulo de treino (antes acessados por
 * um botão "Programas" na home do treino).
 */
export default function TreinoSettings({ onExit }: { onExit: () => void }) {
  const supabase = createClient();
  const online = useOnline();

  const [loading, setLoading] = useState(true);
  const [screen, setScreen] = useState<Screen>("programs");
  const [program, setProgram] = useState<Program | null>(null);
  const [scheduledProgram, setScheduledProgram] = useState<Program | null>(null);
  const [library, setLibrary] = useState<LibraryExercise[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [completedPrograms, setCompletedPrograms] = useState<Program[]>([]);
  const [programSeq, setProgramSeq] = useState<Map<string, number>>(new Map());
  const [editingTarget, setEditingTarget] = useState<"active" | "scheduled">("active");

  async function loadAll() {
    const { data } = await loadWithCache<TreinoSettingsBundle>("treinoSettings", async () => {
      const [p, sp, lib, h, cp, seq] = await Promise.all([
        getActiveProgram(supabase),
        getScheduledProgram(supabase),
        getExerciseLibrary(supabase),
        getHistory(supabase),
        getCompletedPrograms(supabase),
        getProgramSequence(supabase),
      ]);
      return { p, sp, lib, h, cp, seq: Array.from(seq.entries()) };
    }, online);
    setProgram(data.p);
    setScheduledProgram(data.sp);
    setLibrary(data.lib);
    setHistory(data.h);
    setCompletedPrograms(data.cp);
    setProgramSeq(new Map(data.seq));
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await loadAll();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <div style={styles.loadingWrap}>Carregando…</div>;

  if (screen === "programEditor") {
    return (
      <ProgramEditor
        supabase={supabase}
        program={editingTarget === "active" ? program : scheduledProgram}
        library={library}
        history={history}
        target={editingTarget}
        programSeq={programSeq}
        onBack={() => setScreen("programs")}
        onChanged={loadAll}
      />
    );
  }

  if (screen === "library") {
    return <ExerciseLibrary supabase={supabase} library={library} onBack={() => setScreen("programs")} onChanged={loadAll} />;
  }

  if (screen === "completed") {
    return (
      <div style={{ animation: `tabScreenIn .45s ${EASE} both` }}>
        <div style={styles.topNav}>
          <button onClick={() => setScreen("programs")} style={styles.backBtn}>← Programas</button>
        </div>
        <div style={styles.histBody}>
          <h2 style={styles.histTitle}>Programas Concluídos</h2>
          {completedPrograms.length === 0 && <div style={styles.emptyState}>Nenhum programa concluído ainda.</div>}
          {[...completedPrograms].reverse().map((p) => {
            const seq = programSeq.get(p.id) ?? 0;
            return (
              <div key={p.id} style={{ marginBottom: 30 }}>
                <div style={styles.groupHeader}>
                  <span style={styles.groupName}>{`P${seq} · ${p.name}`}</span>
                  <span style={styles.groupRule} />
                  <span style={styles.groupCount}>{`${p.weeks} SEMANAS`}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {p.workouts.map((w) => (
                    <div key={w.id} style={{ ...styles.histExCard, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                      <span style={{ minWidth: 0 }}>
                        <div style={styles.histExName}>{`${w.emoji} P${seq} ${w.name}`}</div>
                        <div style={{ fontSize: 11, color: C.midGray, marginTop: 2 }}>{`${w.exercises.length} exercícios`}</div>
                      </span>
                      <CopyWorkoutButton seq={seq} workout={w} />
                    </div>
                  ))}
                  {p.workouts.length === 0 && <div style={{ fontSize: 12, color: C.midGray }}>Sem treinos registrados.</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <ProgramsOverview
      supabase={supabase}
      program={program}
      scheduledProgram={scheduledProgram}
      completedCount={completedPrograms.length}
      library={library}
      history={history}
      onBack={onExit}
      onChanged={loadAll}
      onOpenActive={() => {
        setEditingTarget("active");
        setScreen("programEditor");
      }}
      onOpenScheduled={() => {
        setEditingTarget("scheduled");
        setScreen("programEditor");
      }}
      onOpenCompleted={() => setScreen("completed")}
      onOpenLibrary={() => setScreen("library")}
    />
  );
}
