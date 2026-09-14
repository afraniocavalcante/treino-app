"use client";

import { useState } from "react";
import { DISPLAY, C, styles } from "@/lib/styles";
import { DiamondIcon, FlagTriangleIcon } from "./Icons";
import ConsistencyHeatmap from "./ConsistencyHeatmap";
import WeightVolumeChart from "./WeightVolumeChart";
import ProgressionHistory from "./ProgressionHistory";
import type { DietMeasurement } from "@/lib/diet";

type Screen = "main" | "progressao";

export default function Insights({
  perfectStreak,
  totalPerfectDays,
  trainedDates,
  dietedDates,
  measurements,
  volumeByDate,
  onStartWorkout,
  openSessionId,
}: {
  perfectStreak: number;
  totalPerfectDays: number;
  trainedDates: Set<string>;
  dietedDates: Set<string>;
  measurements: DietMeasurement[];
  volumeByDate: Map<string, number>;
  /** "Treinar novamente" dentro da Progressão de Carga — navega pro Treino e inicia esse treino. */
  onStartWorkout: (workoutId: string) => void;
  /** Deep link do Treino (treino já feito hoje / "Ver treino feito hoje") pra abrir direto o detalhe dessa sessão. */
  openSessionId?: string;
}) {
  const [screen, setScreen] = useState<Screen>("main");
  // Deep link vindo do Treino (tocar um treino já feito, "Ver treino feito
  // hoje") — pula direto pra Progressão de Carga assim que um novo
  // openSessionId chega. Ajuste durante o render (em vez de um effect) pra
  // não perder um frame; a comparação com o valor anterior evita reabrir
  // sozinho depois que o usuário já voltou pra "main" manualmente.
  const [prevOpenSessionId, setPrevOpenSessionId] = useState(openSessionId);
  if (openSessionId && openSessionId !== prevOpenSessionId) {
    setPrevOpenSessionId(openSessionId);
    setScreen("progressao");
  }

  if (screen === "progressao") {
    return (
      <ProgressionHistory
        onBack={() => setScreen("main")}
        onStartWorkout={onStartWorkout}
        initialSessionId={openSessionId}
      />
    );
  }

  return (
    <div style={{ ...styles.container, padding: 0 }}>
      <div style={{ padding: "30px 22px 14px" }}>
        <div style={{ fontFamily: DISPLAY, fontSize: 23, fontWeight: 600 }}>Insights</div>
        <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: C.honeySoft, border: `1px solid ${C.honeyEdge}`, borderRadius: 6, padding: "6px 11px", fontSize: 12, fontWeight: 700, color: C.honeyText }}>
            <FlagTriangleIcon size={11} color={C.honeyText} />
            {perfectStreak} {perfectStreak === 1 ? "dia perfeito" : "dias perfeitos"}
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(13,27,42,.05)", border: `1px solid ${C.bgHeader}`, borderRadius: 6, padding: "6px 11px", fontSize: 11.5, fontWeight: 600, color: C.lightGray }}>
            <DiamondIcon size={10} color={C.lightGray} />
            {totalPerfectDays} dias completos
          </span>
        </div>
      </div>

      <ConsistencyHeatmap trainedDates={trainedDates} dietDates={dietedDates} weeks={20} />
      <WeightVolumeChart measurements={measurements} volumeByDate={volumeByDate} />

      <div style={{ padding: "0 22px" }}>
        <button className="tab-press" onClick={() => setScreen("progressao")} style={styles.historyBtn}>
          Progressão de carga
        </button>
      </div>

      <div style={styles.hubRetroFoot}>{totalPerfectDays} {totalPerfectDays === 1 ? "dia completo" : "dias completos"} (treino + dieta) registrados até agora.</div>
    </div>
  );
}
