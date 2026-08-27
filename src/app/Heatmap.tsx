"use client";

import { useState } from "react";
import { C, DISPLAY } from "@/lib/styles";
import { formatDate, formatDateDisplay } from "@/lib/program";

const MONTH_NAMES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const DAY_LABELS = ["D", "S", "T", "Q", "Q", "S", "S"];

export default function Heatmap({
  trainedDates,
  weeks = 20,
  compact = false,
  onClick,
}: {
  trainedDates: Set<string>;
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

  const columns: { date: Date; dateStr: string; trained: boolean; future: boolean }[][] = [];
  const cursor = new Date(gridStart);
  for (let w = 0; w < weeks; w++) {
    const col: { date: Date; dateStr: string; trained: boolean; future: boolean }[] = [];
    for (let d = 0; d < 7; d++) {
      const dateStr = formatDate(cursor);
      col.push({ date: new Date(cursor), dateStr, trained: trainedDates.has(dateStr), future: cursor > today });
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
                background: cell.future ? "transparent" : cell.trained ? C.accent : C.bgHeader,
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
          {active ? `${formatDateDisplay(active.dateStr)} — ${active.trained ? "treinou" : "sem treino"}` : `últimas ${weeks} semanas`}
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
      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6, marginTop: 10 }}>
        <span style={{ fontSize: 9.5, color: C.midGray, fontFamily: DISPLAY }}>menos</span>
        <span style={{ width: CELL, height: CELL, borderRadius: 3, background: C.bgHeader }} />
        <span style={{ width: CELL, height: CELL, borderRadius: 3, background: C.accent }} />
        <span style={{ fontSize: 9.5, color: C.midGray, fontFamily: DISPLAY }}>mais</span>
      </div>
    </div>
  );
}
