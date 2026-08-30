"use client";

import { useState } from "react";
import { C } from "@/lib/styles";
import { formatDate, type ExerciseUnit, type ProgramWorkout } from "@/lib/program";

export const UNIT_LABEL: Record<ExerciseUnit, string> = {
  total: "Peso total",
  halter: "Por halter",
  corpo: "Peso do corpo",
};

export function SectionHeader({ title }: { title: string }) {
  return <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.2, color: C.midGray, marginBottom: 10 }}>{title.toUpperCase()}</div>;
}

export function buildWorkoutCopyText(seq: number, workout: ProgramWorkout): string {
  const lines = [...workout.exercises].sort((a, b) => a.orderIndex - b.orderIndex).map((ex) => ex.name);
  return [`P${seq} ${workout.name.toUpperCase()}`, ...lines].join("\n");
}

export function CopyWorkoutButton({ seq, workout }: { seq: number; workout: ProgramWorkout }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      className="tab-press"
      disabled={workout.exercises.length === 0}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(buildWorkoutCopyText(seq, workout));
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          // clipboard access denied — nothing to fall back to silently, ignore
        }
      }}
      style={{ ...confirmSmallBtn, flexShrink: 0, opacity: workout.exercises.length === 0 ? 0.4 : 1 }}
    >
      {copied ? "Copiado ✓" : "Copiar"}
    </button>
  );
}

export function NewProgramForm({
  busy,
  hasExisting,
  scheduling = false,
  onCancel,
  onCreate,
}: {
  busy: boolean;
  hasExisting: boolean;
  scheduling?: boolean;
  onCancel: () => void;
  onCreate: (input: { name: string; startDate: string; weeks: number; restSeconds: number }) => void;
}) {
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState(formatDate(new Date()));
  const [weeks, setWeeks] = useState("4");
  const [restSeconds, setRestSeconds] = useState("90");

  return (
    <div style={{ background: C.bgCard, border: `1px solid ${C.accent}`, borderRadius: 16, padding: 16, marginBottom: 24, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontSize: 13, fontWeight: 700 }}>{scheduling ? "Agendar próximo programa" : "Novo programa"}</div>
      <input placeholder="Nome do programa" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
      {!scheduling && (
        <label style={labelStyle}>Data de início
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={inputStyle} />
        </label>
      )}
      <label style={labelStyle}>Duração (semanas)
        <input type="number" value={weeks} onChange={(e) => setWeeks(e.target.value)} style={inputStyle} />
      </label>
      <label style={labelStyle}>Descanso entre séries (segundos)
        <input type="number" value={restSeconds} onChange={(e) => setRestSeconds(e.target.value)} style={inputStyle} />
      </label>
      {scheduling && (
        <div style={{ fontSize: 11, color: C.midGray }}>A data de início real é definida automaticamente quando este programa entrar em vigor.</div>
      )}
      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
        {hasExisting && <button onClick={onCancel} style={cancelBtn}>Cancelar</button>}
        <button
          disabled={busy || !name.trim() || !weeks || !restSeconds}
          onClick={() => onCreate({ name: name.trim(), startDate, weeks: Number(weeks), restSeconds: Number(restSeconds) })}
          style={{ ...confirmSmallBtn, flex: 1 }}
        >
          {scheduling ? "Agendar" : "Criar programa"}
        </button>
      </div>
    </div>
  );
}

export const inputStyle: React.CSSProperties = {
  background: C.bgPage,
  border: `1px solid ${C.bgHeader}`,
  borderRadius: 10,
  padding: "10px 12px",
  color: C.white,
  fontSize: 13,
  outline: "none",
  width: "100%",
};

export const labelStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  fontSize: 11.5,
  color: C.lightGray,
  fontWeight: 600,
};

export const addBtnStyle: React.CSSProperties = {
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

export const confirmSmallBtn: React.CSSProperties = {
  background: C.accent,
  color: C.bgDark,
  border: "none",
  borderRadius: 10,
  padding: "10px 14px",
  fontSize: 12.5,
  fontWeight: 700,
  cursor: "pointer",
};

export const cancelBtn: React.CSSProperties = {
  background: "transparent",
  border: `1px solid ${C.bgHeader}`,
  color: C.lightGray,
  borderRadius: 10,
  padding: "10px 14px",
  fontSize: 12.5,
  fontWeight: 600,
  cursor: "pointer",
};

export const smallDangerBtn: React.CSSProperties = {
  background: "transparent",
  border: "none",
  color: C.red,
  fontSize: 11,
  fontWeight: 700,
  cursor: "pointer",
  padding: "2px 4px",
};

export const chipBtn: React.CSSProperties = {
  flex: 1,
  padding: "8px 6px",
  borderRadius: 8,
  fontSize: 11,
  fontWeight: 600,
  background: "transparent",
  border: "1px solid",
  cursor: "pointer",
};

export const libRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  background: C.bgCard,
  border: `1px solid ${C.bgHeader}`,
  borderRadius: 10,
  padding: "10px 12px",
};
