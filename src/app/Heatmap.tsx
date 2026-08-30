"use client";

import { useState } from "react";
import { C, DISPLAY } from "@/lib/styles";
import { formatDate, formatDateDisplay } from "@/lib/program";

const MONTH_NAMES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const DAY_LABELS = ["D", "S", "T", "Q", "Q", "S", "S"];

// Categorical, dark-surface palette, CVD-validated for adjacent pairs (incl. wraparound).
const WEEK_COLORS = ["#3987e5", "#d95926", "#199e70", "#c98500"];
function colorForWeek(week: number): string {
  return WEEK_COLORS[(week - 1) % WEEK_COLORS.length];
}

export default function Heatmap({
  trainedDates,
  weekByDate,
  weeks = 20,
  compact = false,
  onClick,
}: {
  trainedDates: Set<string>;
  weekByDate?: Map<string, number>;
  weeks?: number;
  compact?: boolean;
  onClick?: () => void;
}) {
  const [activeDate, setActiveDate] = useState<string | null>(null);
  const CELL = compact ? 8 : 12;
  const GAP = compact ? 2.5 : 3;

  const today = new Date();
  const gridEnd = new Date(today);
  gridEnd.setDate(gridEnd.getDate() + (6 - gridEnd.getDay()));
  const gridStart = new Date(gridEnd);
  gridStart.setDate(gridStart.getDate() - (weeks * 7 - 1));

  const columns: { date: Date; dateStr: string; trained: boolean; future: boolean; week: number | null }[][] = [];
  const cursor = new Date(gridStart);
  for (let w = 0; w < weeks; w++) {
    const col: { date: Date; dateStr: string; trained: boolean; future: boolean; week: number | null }[] = [];
    for (let d = 0; d < 7; d++) {
      const dateStr = formatDate(cursor);
      col.push({
        date: new Date(cursor),
        dateStr,
        trained: trainedDates.has(dateStr),
        future: cursor > today,
        week: weekByDate?.get(dateStr) ?? null,
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    columns.push(col);
  }

  const monthLabels: { text: string; col: number }[] = [];
  let lastMonth = -1;
  columns.forEach((col, i) => {
    const m = col[0].date.getMonth();
    if (m !== lastMonth) {
      monthLabels.push({ text: MONTH_NAMES[m], col: i });
      lastMonth = m;
    }
  });

  const active = activeDate ? columns.flat().find((c) => c.dateStr === activeDate) : null;
  const trainedCount = columns.flat().filter((c) => !c.future && c.trained).length;
  const weeksInView = [...new Set(columns.flat().filter((c) => c.trained && c.week != null).map((c) => c.week as number))]
    .sort((a, b) => a - b)
    .slice(-4);

  const grid = (
    <div style={{ display: "flex", gap: GAP }}>
      {!compact && (
        <div style={{ display: "flex", flexDirection: "column", gap: GAP, marginRight: 4 }}>
          {DAY_LABELS.map((l, i) => (
            <span key={i} style={{ width: CELL, height: CELL, fontSize: 8.5, color: C.midGray, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {i % 2 === 1 ? l : ""}
            </span>
          ))}
        </div>
      )}
      {columns.map((col, ci) => (
        <div key={ci} style={{ display: "flex", flexDirection: "column", gap: GAP }}>
          {col.map((cell) => (
            <div
              key={cell.dateStr}
              onClick={compact ? undefined : () => !cell.future && setActiveDate(cell.dateStr === activeDate ? null : cell.dateStr)}
              style={{
                width: CELL,
                height: CELL,
                borderRadius: compact ? 2 : 3,
                background: cell.future ? "transparent" : cell.trained ? (cell.week ? colorForWeek(cell.week) : C.accent) : C.bgHeader,
                outline: !compact && cell.dateStr === activeDate ? `1.5px solid ${C.white}` : "none",
                cursor: compact || cell.future ? "default" : "pointer",
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );

  if (compact) {
    return (
      <div
        onClick={onClick}
        className={onClick ? "tab-press" : undefined}
        style={{ background: C.bgCard, border: `1px solid ${C.bgHeader}`, borderRadius: 16, padding: "16px 18px", cursor: onClick ? "pointer" : "default" }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 700 }}>📅 Consistência</span>
          <span style={{ fontSize: 11, color: C.midGray }}>{trainedCount} treinos · {weeks}sem →</span>
        </div>
        <div style={{ overflowX: "auto" }}>{grid}</div>
      </div>
    );
  }

  return (
    <div style={{ background: C.bgCard, border: `1px solid ${C.bgHeader}`, borderRadius: 16, padding: "16px 16px 14px" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 700 }}>Consistência</span>
        <span style={{ fontSize: 11, color: C.midGray }}>
          {active
            ? `${formatDateDisplay(active.dateStr)} — ${active.trained ? (active.week ? `Semana ${active.week}` : "treinou") : "sem treino"}`
            : `últimas ${weeks} semanas`}
        </span>
      </div>
      <div style={{ overflowX: "auto", paddingBottom: 4 }}>
        <div style={{ display: "inline-block" }}>
          <div style={{ display: "flex", marginLeft: CELL + GAP + 4, marginBottom: 4, position: "relative", height: 12 }}>
            {monthLabels.map((m) => (
              <span
                key={`${m.text}-${m.col}`}
                style={{ position: "absolute", left: m.col * (CELL + GAP), fontSize: 9.5, color: C.midGray, fontWeight: 600 }}
              >
                {m.text}
              </span>
            ))}
          </div>
          {grid}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
        {weeksInView.length > 0 ? (
          weeksInView.map((w) => (
            <span key={w} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: CELL, height: CELL, borderRadius: 3, background: colorForWeek(w) }} />
              <span style={{ fontSize: 9.5, color: C.midGray, fontFamily: DISPLAY, fontWeight: 700 }}>{`S${w}`}</span>
            </span>
          ))
        ) : (
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: CELL, height: CELL, borderRadius: 3, background: C.accent }} />
            <span style={{ fontSize: 9.5, color: C.midGray, fontFamily: DISPLAY }}>treinou</span>
          </span>
        )}
      </div>
    </div>
  );
}
