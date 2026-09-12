"use client";

import { useState } from "react";
import { C, styles } from "@/lib/styles";
import { formatDate, formatDateDisplay } from "@/lib/program";

const DAY_LABELS = ["D", "S", "T", "Q", "Q", "S", "S"];

/**
 * Diagonal-split cells: top-left triangle = treino, bottom-right = dieta.
 * Both done → both colors; only one → half-painted; neither → empty.
 */
export default function ConsistencyHeatmap({
  trainedDates,
  dietDates,
  weeks = 13,
}: {
  trainedDates: Set<string>;
  dietDates: Set<string>;
  weeks?: number;
}) {
  const [activeDate, setActiveDate] = useState<string | null>(null);
  const CELL = 11;
  const GAP = 3;

  const today = new Date();
  const gridEnd = new Date(today);
  gridEnd.setDate(gridEnd.getDate() + (6 - gridEnd.getDay()));
  const gridStart = new Date(gridEnd);
  gridStart.setDate(gridStart.getDate() - (weeks * 7 - 1));

  const columns: { date: Date; dateStr: string; trained: boolean; dieted: boolean; future: boolean }[][] = [];
  const cursor = new Date(gridStart);
  for (let w = 0; w < weeks; w++) {
    const col: (typeof columns)[number] = [];
    for (let d = 0; d < 7; d++) {
      const dateStr = formatDate(cursor);
      col.push({
        date: new Date(cursor),
        dateStr,
        trained: trainedDates.has(dateStr),
        dieted: dietDates.has(dateStr),
        future: cursor > today,
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    columns.push(col);
  }

  const active = activeDate ? columns.flat().find((c) => c.dateStr === activeDate) : null;
  const bothCount = columns.flat().filter((c) => !c.future && c.trained && c.dieted).length;

  function activeLabel(): string {
    if (!active) return `últimas ${weeks} semanas`;
    const parts: string[] = [];
    if (active.trained) parts.push("treinou");
    if (active.dieted) parts.push("dieta em dia");
    return `${formatDateDisplay(active.dateStr)} — ${parts.length ? parts.join(" · ") : "nada registrado"}`;
  }

  return (
    <div style={{ ...styles.dietSectionCard, margin: "16px 20px 0" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 700 }}>Consistência combinada</span>
        <span style={{ fontSize: 10.5, color: C.midGray }}>{activeLabel()}</span>
      </div>
      <div style={{ overflowX: "auto", paddingBottom: 4 }}>
        <div style={{ display: "flex", gap: GAP }}>
          <div style={{ display: "flex", flexDirection: "column", gap: GAP, marginRight: 4 }}>
            {DAY_LABELS.map((l, i) => (
              <span key={i} style={{ width: CELL, height: CELL, fontSize: 8, color: C.midGray, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {i % 2 === 1 ? l : ""}
              </span>
            ))}
          </div>
          {columns.map((col, ci) => (
            <div key={ci} style={{ display: "flex", flexDirection: "column", gap: GAP }}>
              {col.map((cell) => (
                <div
                  key={cell.dateStr}
                  onClick={() => !cell.future && setActiveDate(cell.dateStr === activeDate ? null : cell.dateStr)}
                  style={{
                    width: CELL,
                    height: CELL,
                    borderRadius: 3,
                    background: cell.future
                      ? "transparent"
                      : `linear-gradient(135deg, ${cell.trained ? C.accent : C.bgHeader} 50%, ${cell.dieted ? C.honey : C.bgHeader} 50%)`,
                    outline: cell.dateStr === activeDate ? `1.5px solid ${C.white}` : "none",
                    cursor: cell.future ? "default" : "pointer",
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
        <span style={{ fontSize: 10.5, color: C.midGray }}>{bothCount} dias completos (treino + dieta)</span>
        <div style={{ display: "flex", gap: 10 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 9.5, color: C.midGray }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: C.accent }} /> treino
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 9.5, color: C.midGray }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: C.honey }} /> dieta
          </span>
        </div>
      </div>
    </div>
  );
}
