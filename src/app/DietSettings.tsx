"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getCompletedDietPlans, getDietPlan, getDietPlanSequence, getScheduledDietPlan } from "@/lib/dietData";
import type { DietPlan, DietPlanSummary } from "@/lib/diet";
import { C, DISPLAY, G, SCREEN_ANIM, styles } from "@/lib/styles";
import { loadWithCache, useOnline } from "@/lib/offline";
import DietPlanEditor from "./DietPlanEditor";
import { addBtnStyle } from "./programShared";

type Screen = "overview" | "editor" | "completed";

interface DietSettingsBundle {
  active: DietPlan | null;
  scheduled: DietPlan | null;
  completed: DietPlanSummary[];
  seq: [string, number][];
}

/** Configurações de dieta — plano ativo/agendado/concluídos, tratados como PA1, PA2... */
export default function DietSettings() {
  const supabase = createClient();
  const online = useOnline();

  const [loading, setLoading] = useState(true);
  const [screen, setScreen] = useState<Screen>("overview");
  const [active, setActive] = useState<DietPlan | null>(null);
  const [scheduled, setScheduled] = useState<DietPlan | null>(null);
  const [completed, setCompleted] = useState<DietPlanSummary[]>([]);
  const [planSeq, setPlanSeq] = useState<Map<string, number>>(new Map());
  const [editingTarget, setEditingTarget] = useState<"active" | "scheduled">("active");

  async function loadAll() {
    const { data } = await loadWithCache<DietSettingsBundle>(
      "dietSettings",
      async () => {
        const [a, s, c, seq] = await Promise.all([
          getDietPlan(supabase),
          getScheduledDietPlan(supabase),
          getCompletedDietPlans(supabase),
          getDietPlanSequence(supabase),
        ]);
        return { active: a, scheduled: s, completed: c, seq: Array.from(seq.entries()) };
      },
      online
    );
    setActive(data.active);
    setScheduled(data.scheduled);
    setCompleted(data.completed);
    setPlanSeq(new Map(data.seq));
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await loadAll();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <div style={styles.loadingWrap}>Carregando…</div>;

  if (screen === "editor") {
    return (
      <DietPlanEditor
        supabase={supabase}
        plan={editingTarget === "active" ? active : scheduled}
        target={editingTarget}
        planSeq={planSeq}
        onBack={() => setScreen("overview")}
        onChanged={loadAll}
      />
    );
  }

  if (screen === "completed") {
    return (
      <div style={{ animation: SCREEN_ANIM }}>
        <div style={styles.topNav}>
          <button onClick={() => setScreen("overview")} style={styles.backBtn}>← Plano</button>
        </div>
        <div style={styles.histBody}>
          <h2 style={styles.histTitle}>Planos Concluídos</h2>
          {completed.length === 0 && <div style={styles.emptyState}>Nenhum plano concluído ainda.</div>}
          {[...completed].reverse().map((p) => {
            const seq = planSeq.get(p.id) ?? 0;
            return (
              <div key={p.id} style={{ ...styles.histExCard, marginBottom: 10 }}>
                <div style={styles.histExName}>{`PA${seq} · ${p.name}`}</div>
                <div style={{ fontSize: 11, color: C.midGray, marginTop: 2 }}>
                  {p.kcalTarget} kcal{p.startDate ? ` · ${p.startDate}` : ""}{p.endDate ? ` até ${p.endDate}` : ""}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div style={{ animation: SCREEN_ANIM }}>
      <div style={{ ...styles.histBody, paddingBottom: 40 }}>
        <h2 style={styles.histTitle}>Plano alimentar</h2>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
          {active ? (
            <PlanCard
              onClick={() => {
                setEditingTarget("active");
                setScreen("editor");
              }}
              badge="ATIVO"
              badgeColor={C.accent}
              name={`PA${planSeq.get(active.id) ?? 0} · ${active.name}`}
              detail={`${active.kcalTarget} kcal${active.endDate ? ` · válido até ${active.endDate}` : ""}`}
              highlighted
            />
          ) : (
            <button
              onClick={() => {
                setEditingTarget("active");
                setScreen("editor");
              }}
              style={{ ...addBtnStyle, textAlign: "left" }}
            >
              + Criar plano alimentar
            </button>
          )}

          {active &&
            (scheduled ? (
              <PlanCard
                onClick={() => {
                  setEditingTarget("scheduled");
                  setScreen("editor");
                }}
                badge="AGENDADO"
                badgeColor={C.accent}
                name={`${scheduled.name}`}
                detail="Começa quando o atual terminar ou expirar"
              />
            ) : (
              <button
                onClick={() => {
                  setEditingTarget("scheduled");
                  setScreen("editor");
                }}
                style={{ ...addBtnStyle, textAlign: "left" }}
              >
                + Agendar próximo plano
              </button>
            ))}

          {completed.length > 0 && (
            <PlanCard
              onClick={() => setScreen("completed")}
              badge="ARQUIVO"
              badgeColor={C.midGray}
              name="Planos Concluídos"
              detail={`${completed.length} ${completed.length === 1 ? "plano" : "planos"}`}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function PlanCard({
  onClick,
  badge,
  badgeColor,
  name,
  detail,
  highlighted = false,
}: {
  onClick: () => void;
  badge: string;
  badgeColor: string;
  name: string;
  detail: string;
  highlighted?: boolean;
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
        background: highlighted ? G.glassActive : C.bgCard,
        border: `1px solid ${highlighted ? C.accentEdge : C.bgHeader}`,
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
