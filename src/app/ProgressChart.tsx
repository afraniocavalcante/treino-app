"use client";

import { useId, useState } from "react";
import { C, DISPLAY } from "@/lib/styles";
import { formatDateDisplay, type ExercisePoint, type ExerciseUnit } from "@/lib/program";

const W = 320;
const H = 140;
const PAD_X = 16;
const PAD_TOP = 20;
const PAD_BOTTOM = 26;

export default function ProgressChart({
  points,
  exerciseName,
  unit,
}: {
  points: ExercisePoint[];
  exerciseName: string;
  unit: ExerciseUnit;
}) {
  const gradientId = useId();
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  if (points.length === 0) {
    return (
      <div style={cardStyle}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{exerciseName}</div>
        <div style={{ fontSize: 12, color: C.midGray, padding: "20px 0", textAlign: "center" }}>
          Sem dados ainda para este exercício.
        </div>
      </div>
    );
  }

  const kgs = points.map((p) => p.kg);
  const maxKg = Math.max(...kgs);
  const minKg = Math.min(...kgs);
  const prIdx = kgs.lastIndexOf(maxKg);
  const range = maxKg - minKg || 1;
  const plotW = W - PAD_X * 2;
  const plotH = H - PAD_TOP - PAD_BOTTOM;

  const xAt = (i: number) => (points.length === 1 ? W / 2 : PAD_X + (i / (points.length - 1)) * plotW);
  const yAt = (kg: number) => PAD_TOP + plotH - ((kg - minKg) / range) * plotH;

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${xAt(i).toFixed(1)} ${yAt(p.kg).toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L ${xAt(points.length - 1).toFixed(1)} ${(PAD_TOP + plotH).toFixed(1)} L ${xAt(0).toFixed(1)} ${(PAD_TOP + plotH).toFixed(1)} Z`;

  const active = activeIdx !== null ? points[activeIdx] : null;
  const suffix = unit === "halter" ? "kg cada" : "kg";

  return (
    <div style={cardStyle}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 2 }}>
        <span style={{ fontSize: 13, fontWeight: 700 }}>{exerciseName}</span>
        <span style={{ fontSize: 11, color: C.midGray }}>
          {points.length} {points.length === 1 ? "registro" : "registros"}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
        <span style={{ fontFamily: DISPLAY, fontSize: 22, fontWeight: 700, color: C.accent }}>
          {active ? active.kg : maxKg}
          <span style={{ fontSize: 12, color: C.midGray, fontWeight: 600 }}> {suffix}</span>
        </span>
        <span style={{ fontSize: 10.5, fontWeight: 700, color: C.green, background: "rgba(46,213,115,0.12)", padding: "2px 7px", borderRadius: 6 }}>
          {active ? formatDateDisplay(active.date) : `PR ${maxKg}${suffix === "kg cada" ? " cada" : ""}`}
        </span>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height={H}
        style={{ display: "block", overflow: "visible" }}
        onMouseLeave={() => setActiveIdx(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={C.accent} stopOpacity="0.22" />
            <stop offset="100%" stopColor={C.accent} stopOpacity="0" />
          </linearGradient>
        </defs>

        {points.length > 1 && <path d={areaPath} fill={`url(#${gradientId})`} stroke="none" />}
        {points.length > 1 && (
          <path d={linePath} fill="none" stroke={C.accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        )}

        {points.map((p, i) => {
          const isPR = i === prIdx;
          const isActive = i === activeIdx;
          const r = isPR ? 5 : isActive ? 5 : 3.5;
          return (
            <g key={p.date + i}>
              <circle
                cx={xAt(i)}
                cy={yAt(p.kg)}
                r={r + 6}
                fill="transparent"
                onMouseEnter={() => setActiveIdx(i)}
                onClick={() => setActiveIdx(i === activeIdx ? null : i)}
                style={{ cursor: "pointer" }}
              />
              <circle
                cx={xAt(i)}
                cy={yAt(p.kg)}
                r={r}
                fill={isPR ? C.green : C.accent}
                stroke={C.bgCard}
                strokeWidth={isActive || isPR ? 2 : 1.5}
              />
            </g>
          );
        })}

        <text x={xAt(0)} y={H - 6} fontSize="9.5" fill={C.midGray} textAnchor="start">
          {formatDateDisplay(points[0].date)}
        </text>
        {points.length > 1 && (
          <text x={xAt(points.length - 1)} y={H - 6} fontSize="9.5" fill={C.midGray} textAnchor="end">
            {formatDateDisplay(points[points.length - 1].date)}
          </text>
        )}
      </svg>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: C.bgCard,
  border: `1px solid ${C.bgHeader}`,
  borderRadius: 16,
  padding: "16px 16px 10px",
};
