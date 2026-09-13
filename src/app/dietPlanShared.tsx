"use client";

import { useState } from "react";
import { C } from "@/lib/styles";
import { formatDietDate } from "@/lib/diet";
import type { DietPlanFieldsInput } from "@/lib/dietData";
import { confirmSmallBtn, cancelBtn, inputStyle, labelStyle } from "./programShared";

export { inputStyle, labelStyle, addBtnStyle, confirmSmallBtn, cancelBtn, smallDangerBtn } from "./programShared";

/** Shared create/schedule form for a diet plan's scalar fields — mirrors NewProgramForm in programShared.tsx. */
export function NewDietPlanForm({
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
  onCreate: (input: DietPlanFieldsInput) => void;
}) {
  const [name, setName] = useState("");
  const [kcal, setKcal] = useState("2000");
  const [protein, setProtein] = useState("150");
  const [carb, setCarb] = useState("200");
  const [fat, setFat] = useState("60");
  const [endDate, setEndDate] = useState("");
  const [objective, setObjective] = useState("");

  const valid = name.trim() && kcal && protein && carb && fat;

  return (
    <div style={{ background: C.bgCard, border: `1px solid ${C.accent}`, borderRadius: 16, padding: 16, marginBottom: 24, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontSize: 13, fontWeight: 700 }}>{scheduling ? "Agendar próximo plano" : "Novo plano alimentar"}</div>
      <input placeholder="Nome do plano (ex.: PA2)" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <label style={labelStyle}>Kcal
          <input type="number" value={kcal} onChange={(e) => setKcal(e.target.value)} style={inputStyle} />
        </label>
        <label style={labelStyle}>Proteína (g)
          <input type="number" value={protein} onChange={(e) => setProtein(e.target.value)} style={inputStyle} />
        </label>
        <label style={labelStyle}>Carbo (g)
          <input type="number" value={carb} onChange={(e) => setCarb(e.target.value)} style={inputStyle} />
        </label>
        <label style={labelStyle}>Gordura (g)
          <input type="number" value={fat} onChange={(e) => setFat(e.target.value)} style={inputStyle} />
        </label>
      </div>
      <label style={labelStyle}>Objetivo (opcional)
        <input value={objective} onChange={(e) => setObjective(e.target.value)} style={inputStyle} />
      </label>
      <label style={labelStyle}>Válido até (opcional)
        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={inputStyle} />
      </label>
      {scheduling && (
        <div style={{ fontSize: 11, color: C.midGray }}>A data de início real é definida automaticamente quando este plano entrar em vigor.</div>
      )}
      <div style={{ fontSize: 11, color: C.midGray }}>
        As 5 refeições (café, almoço, lanche, jantar, sobremesa) são criadas vazias — edite o conteúdo de cada uma depois de salvar.
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
        {hasExisting && <button onClick={onCancel} style={cancelBtn}>Cancelar</button>}
        <button
          disabled={busy || !valid}
          onClick={() =>
            onCreate({
              name: name.trim(),
              kcalTarget: Number(kcal),
              proteinTarget: Number(protein),
              carbTarget: Number(carb),
              fatTarget: Number(fat),
              objective: objective.trim() || null,
              endDate: endDate || null,
            })
          }
          style={{ ...confirmSmallBtn, flex: 1 }}
        >
          {scheduling ? "Agendar" : "Criar plano"}
        </button>
      </div>
    </div>
  );
}

export function today(): string {
  return formatDietDate(new Date());
}
