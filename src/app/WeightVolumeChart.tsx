"use client";

import { useId, useState } from "react";
import { C, DISPLAY, styles } from "@/lib/styles";
import { formatDateDisplay } from "@/lib/program";
import type { DietMeasurement } from "@/lib/diet";

const W = 320;
const H = 150;
const PAD_X = 16;
const PAD_TOP = 20;
const PAD_BOTTOM = 26;

export default function WeightVolumeChart({
  measurements,
  volumeByDate,
}: {
  measurements: DietMeasurement[];
  volumeByDate: Map<string, number>;
}) {
  const gradientId = useId();
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  const points = [...measurements]
    .filter((m) => m.weight != null)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
    .slice(-16)
    .map((m) => ({ date: m.date, weight: m.weight as number, volume: volumeByDate.get(m.date) ?? 0 }));

  if (points.length === 0) {
    return (
      <div style={styles.hubRetroCard}>
        <div style={styles.hubRetroTitle}>Peso × carga de treino</div>
        <div style={{ fontSize: 12, color: C.midGray, textAlign: "center", padding: "10px 0" }}>
          Registre seu peso na Dieta pra ver essa correlação aqui.
        </div>
      </div>
    );
  }

  const weights = points.map((p) => p.weight);
  const maxW = Math.max(...weights);
  const minW = Math.min(...weights);
  const rangeW = maxW - minW || 1;
  const maxVol = Math.max(...points.map((p) => p.volume), 1);

  const plotW = W - PAD_X * 2;
  const plotH = H - PAD_TOP - PAD_BOTTOM;
  const xAt = (i: number) => (points.length === 1 ? W / 2 : PAD_X + (i / (points.length - 1)) * plotW);
  const yAt = (w: number) => PAD_TOP + plotH - ((w - minW) / rangeW) * plotH;
  const barH = (v: number) => (v / maxVol) * plotH * 0.55;

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${xAt(i).toFixed(1)} ${yAt(p.weight).toFixed(1)}`).join(" ");
  const active = activeIdx !== null ? points[activeIdx] : null;
  const barW = Math.min(14, (plotW / points.length) * 0.5);

  return (
    <div style={styles.hubRetroCard}>
      <div style={{ ...styles.hubRetroTitle, marginBottom: 4 }}>Peso × carga de treino</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
        <span style={{ fontFamily: DISPLAY, fontSize: 18, fontWeight: 700, color: C.steelMid }}>
          {active ? active.weight : points[points.length - 1].weight}
          <span style={{ fontSize: 10.5, color: C.faint, fontWeight: 600 }}> kg</span>
        </span>
        {active && active.volume > 0 && (
          <span style={{ fontFamily: DISPLAY, fontSize: 14, fontWeight: 700, color: C.steel }}>
            {active.volume.toLocaleString("pt-BR")}
            <span style={{ fontSize: 10.5, color: C.faint, fontWeight: 600 }}> kg carga</span>
          </span>
        )}
        <span style={{ fontSize: 10.5, color: C.faint }}>{active ? formatDateDisplay(active.date) : "peso mais recente"}</span>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ display: "block", overflow: "visible" }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={C.steel} stopOpacity="0.2" />
            <stop offset="100%" stopColor={C.steel} stopOpacity="0" />
          </linearGradient>
        </defs>

        {points.map((p, i) =>
          p.volume > 0 ? (
            <g key={`bar-${p.date}`}>
              <rect
                x={xAt(i) - Math.max(barW, 20) / 2}
                y={0}
                width={Math.max(barW, 20)}
                height={H}
                fill="transparent"
                onClick={() => setActiveIdx(i === activeIdx ? null : i)}
                style={{ cursor: "pointer" }}
              />
              <rect
                x={xAt(i) - barW / 2}
                y={PAD_TOP + plotH - barH(p.volume)}
                width={barW}
                height={barH(p.volume)}
                rx={2}
                fill={i === activeIdx ? C.steelEdge : C.steelSoft}
                stroke={C.steelEdge}
                style={{ pointerEvents: "none" }}
              />
            </g>
          ) : null
        )}

        {points.length > 1 && (
          <path
            d={linePath}
            fill="none"
            stroke={C.steel}
            strokeWidth="2.25"
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength={1}
            style={{ strokeDasharray: 1, animation: "tabChartDraw 900ms cubic-bezier(.2,.8,.2,1) both" }}
          />
        )}

        {points.map((p, i) => (
          <g key={p.date}>
            <circle cx={xAt(i)} cy={yAt(p.weight)} r={10} fill="transparent" onMouseEnter={() => setActiveIdx(i)} onClick={() => setActiveIdx(i === activeIdx ? null : i)} style={{ cursor: "pointer" }} />
            <circle cx={xAt(i)} cy={yAt(p.weight)} r={i === activeIdx ? 5 : 3.5} fill={C.steel} stroke={C.bgCard} strokeWidth={1.5} />
          </g>
        ))}

        <text x={xAt(0)} y={H - 6} fontSize="9.5" fill={C.faint} textAnchor="start">{formatDateDisplay(points[0].date)}</text>
        {points.length > 1 && (
          <text x={xAt(points.length - 1)} y={H - 6} fontSize="9.5" fill={C.faint} textAnchor="end">{formatDateDisplay(points[points.length - 1].date)}</text>
        )}
      </svg>
      <div style={{ display: "flex", gap: 14, marginTop: 2 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 9.5, color: C.midGray }}>
          <span style={{ width: 10, height: 2, background: C.steel, display: "inline-block" }} /> peso
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 9.5, color: C.midGray }}>
          <span style={{ width: 8, height: 8, background: C.steelSoft, border: `1px solid ${C.steelEdge}`, borderRadius: 2, display: "inline-block" }} /> volume de treino no dia
        </span>
      </div>
    </div>
  );
}
