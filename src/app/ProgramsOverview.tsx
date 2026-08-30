"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createProgram } from "@/lib/data";
import { getCurrentWeek, type HistoryEntry, type LibraryExercise, type Program } from "@/lib/program";
import { C, DISPLAY, G, styles } from "@/lib/styles";
import { addBtnStyle, NewProgramForm } from "./programShared";

export default function ProgramsOverview({
  supabase,
  program,
  scheduledProgram,
  completedCount,
  library,
  history,
  onBack,
  onChanged,
  onOpenActive,
  onOpenScheduled,
  onOpenCompleted,
  onOpenLibrary,
}: {
  supabase: SupabaseClient;
  program: Program | null;
  scheduledProgram: Program | null;
  completedCount: number;
  library: LibraryExercise[];
  history: HistoryEntry[];
  onBack: () => void;
  onChanged: () => Promise<void>;
  onOpenActive: () => void;
  onOpenScheduled: () => void;
  onOpenCompleted: () => void;
  onOpenLibrary: () => void;
}) {
  return (
    <div style={{ animation: "tabScreenIn .45s cubic-bezier(.2,.8,.2,1) both" }}>
      <div style={styles.topNav}>
        <button onClick={onBack} style={styles.backBtn}>← Início</button>
      </div>
      <div style={{ ...styles.histBody, paddingBottom: 40 }}>
        <h2 style={styles.histTitle}>Programas</h2>

        {!program ? (
          <NewProgramForm
            busy={false}
            hasExisting={false}
            onCancel={() => {}}
            onCreate={(input) =>
              createProgram(supabase, input).then(onChanged)
            }
          />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
            <ProgramCard
              onClick={onOpenActive}
              badge="ATIVO"
              badgeColor={C.accent}
              name={program.name}
              detail={`Semana ${getCurrentWeek(program, history)} de ${program.weeks}`}
              active
            />

            {scheduledProgram ? (
              <ProgramCard
                onClick={onOpenScheduled}
                badge="AGENDADO"
                badgeColor={C.accent}
                name={scheduledProgram.name}
                detail="Começa quando o atual terminar"
              />
            ) : (
              <button onClick={onOpenScheduled} style={{ ...addBtnStyle, textAlign: "left" }}>
                + Agendar próximo programa
              </button>
            )}

            {completedCount > 0 && (
              <ProgramCard
                onClick={onOpenCompleted}
                badge="ARQUIVO"
                badgeColor={C.midGray}
                name="Programas Concluídos"
                detail={`${completedCount} ${completedCount === 1 ? "programa" : "programas"}`}
              />
            )}
          </div>
        )}

        <button onClick={onOpenLibrary} style={{ ...addBtnStyle, textAlign: "left" }}>
          🎬 Biblioteca de Exercícios <span style={{ color: C.midGray, fontWeight: 400 }}>({library.length})</span>
        </button>
      </div>
    </div>
  );
}

function ProgramCard({
  onClick,
  badge,
  badgeColor,
  name,
  detail,
  active = false,
}: {
  onClick: () => void;
  badge: string;
  badgeColor: string;
  name: string;
  detail: string;
  active?: boolean;
}) {
  return (
    <button
      className="tab-press"
      onClick={onClick}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        textAlign: "left",
        background: active ? G.glassActive : C.bgCard,
        border: `1px solid ${active ? C.accentEdge : C.bgHeader}`,
        borderRadius: 16,
        padding: "16px 18px",
        cursor: "pointer",
        width: "100%",
      }}
    >
      <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: 1, color: badgeColor }}>{badge}</span>
        <span style={{ color: C.midGray, fontSize: 14 }}>→</span>
      </span>
      <span style={{ fontFamily: DISPLAY, fontSize: 16, fontWeight: 700 }}>{name}</span>
      <span style={{ fontSize: 11.5, color: C.midGray }}>{detail}</span>
    </button>
  );
}

