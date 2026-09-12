"use client";

import { useState } from "react";
import { C, styles } from "@/lib/styles";
import { formatDate, formatDateDisplay } from "@/lib/program";

/**
 * Diagonal-split cells: top-left triangle = treino, bottom-right = dieta.
 * Both done → both colors; only one → half-painted; neither → empty.
 * Columns (weeks) are the clickable unit — selecting one shows its date range below.
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
  const today = new Date();
  const gridEnd = new Date(today);
  gridEnd.setDate(gridEnd.getDate() + (6 - gridEnd.getDay()));
  const gridStart = new Date(gridEnd);
  gridStart.setDate(gridStart.getDate() - (weeks * 7 - 1));

  const columns: { start: Date; end: Date; cells: { dateStr: string; trained: boolean; dieted: boolean; future: boolean }[] }[] = [];
  const cursor = new Date(gridStart);
  for (let w = 0; w < weeks; w++) {
    const cells: (typeof columns)[number]["cells"] = [];
    const start = new Date(cursor);
    for (let d = 0; d < 7; d++) {
      const dateStr = formatDate(cursor);
      cells.push({ dateStr, trained: trainedDates.has(dateStr), dieted: dietDates.has(dateStr), future: cursor > today });
      cursor.setDate(cursor.getDate() + 1);
    }
    const end = new Date(cursor);
    end.setDate(end.getDate() - 1);
    columns.push({ start, end, cells });
  }

  const [selectedWeek, setSelectedWeek] = useState(columns.length - 1);
  const active = columns[selectedWeek];
  const bothCount = columns.flatMap((c) => c.cells).filter((c) => !c.future && c.trained && c.dieted).length;

  return (
    <div style={styles.hubRetroCard}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 }}>
        <span style={styles.hubRetroTitle}>Consistência combinada</span>
        <span style={{ fontSize: 10.5, color: C.faint }}>{weeks} semanas</span>
      </div>
      <div style={{ display: "flex", gap: 3, overflowX: "auto", paddingBottom: 2 }}>
        {columns.map((col, ci) => (
          <div
            key={ci}
            onClick={() => setSelectedWeek(ci)}
            style={{
              display: "grid",
              gridTemplateRows: "repeat(7, 11px)",
              gap: 3,
              padding: 3,
              borderRadius: 5,
              cursor: "pointer",
              background: ci === selectedWeek ? "rgba(159,180,196,.16)" : "transparent",
              flexShrink: 0,
            }}
          >
            {col.cells.map((cell) => (
              <div
                key={cell.dateStr}
                style={{
                  width: 11,
                  height: 11,
                  borderRadius: 2,
                  background: cell.future
                    ? "transparent"
                    : `linear-gradient(135deg, ${cell.trained ? C.accent : "rgba(255,255,255,.07)"} 50%, ${cell.dieted ? C.honey : "rgba(255,255,255,.07)"} 50%)`,
                }}
              />
            ))}
          </div>
        ))}
      </div>
      <div style={{ fontSize: 10.5, color: C.midGray, marginTop: 8 }}>
        Semana selecionada: <span style={{ color: C.lightGray, fontWeight: 600 }}>{formatDateDisplay(formatDate(active.start))} – {formatDateDisplay(formatDate(active.end))}</span>
      </div>
      <div style={{ display: "flex", gap: 14, marginTop: 12, flexWrap: "wrap" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 9.5, color: C.midGray }}>
          <span style={{ width: 9, height: 9, borderRadius: 2, background: C.accent, display: "inline-block" }} /> treino
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 9.5, color: C.midGray }}>
          <span style={{ width: 9, height: 9, borderRadius: 2, background: C.honey, display: "inline-block" }} /> dieta
        </span>
        <span style={{ fontSize: 9.5, color: C.midGray }}>{bothCount} dias completos</span>
      </div>
    </div>
  );
}
