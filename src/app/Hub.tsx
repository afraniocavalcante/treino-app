"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getActiveProgram, getHistory } from "@/lib/data";
import { getCurrentWeek, getNextWorkoutIndex, getTrainingStreak, isRestDay, formatDate, type Program, type HistoryEntry } from "@/lib/program";
import { getDietDayLogs, getDietPlan, getTodayDietLog } from "@/lib/dietData";
import { dayTotals, emptyDietDay, getDietStreak, type DietDayLog, type DietDayPicks, type DietPlan } from "@/lib/diet";
import { C, DISPLAY, styles } from "@/lib/styles";
import { signOut } from "./actions";
import WorkoutApp from "./WorkoutApp";
import DietApp from "./DietApp";

type Route = "hub" | "treino" | "dieta";

export default function Hub() {
  const supabase = createClient();
  const [route, setRoute] = useState<Route>("hub");
  const [loading, setLoading] = useState(true);

  const [program, setProgram] = useState<Program | null>(null);
  const [trainHistory, setTrainHistory] = useState<HistoryEntry[]>([]);
  const [dietPlan, setDietPlan] = useState<DietPlan | null>(null);
  const [todayPicks, setTodayPicks] = useState<DietDayPicks>(emptyDietDay());
  const [dietHistory, setDietHistory] = useState<DietDayLog[]>([]);

  useEffect(() => {
    if (route !== "hub") return;
    let cancelled = false;
    (async () => {
      const [p, h, plan, today, dh] = await Promise.all([
        getActiveProgram(supabase),
        getHistory(supabase),
        getDietPlan(supabase),
        getTodayDietLog(supabase),
        getDietDayLogs(supabase),
      ]);
      if (cancelled) return;
      setProgram(p);
      setTrainHistory(h);
      setDietPlan(plan);
      setTodayPicks(today.picks);
      setDietHistory(dh);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route]);

  if (route === "treino") return <WorkoutApp onGoHub={() => setRoute("hub")} />;
  if (route === "dieta") return <DietApp onExit={() => setRoute("hub")} />;

  if (loading) return <div style={styles.loadingWrap}>Carregando…</div>;

  let trainSub = "Nenhum programa ativo";
  let trainStat = "";
  if (program) {
    const week = getCurrentWeek(program, trainHistory);
    const nextIdx = getNextWorkoutIndex(program, trainHistory);
    const nextWorkout = program.workouts[nextIdx];
    const restToday = isRestDay(program, trainHistory, formatDate(new Date()));
    const streak = getTrainingStreak(program, trainHistory);
    trainSub = restToday ? "Hoje é dia de descanso" : nextWorkout ? `Próximo: ${nextWorkout.emoji} ${nextWorkout.name}` : "";
    trainStat = `🔥 ${streak} ${streak === 1 ? "dia" : "dias"} · Semana ${week}/${program.weeks}`;
  }

  let dietSub = "Nenhum plano cadastrado";
  let dietStat = "";
  if (dietPlan) {
    const totals = dayTotals(dietPlan, todayPicks);
    const streak = getDietStreak(dietPlan, todayPicks, dietHistory);
    dietSub = `${totals.kcal} de ${dietPlan.kcalTarget} kcal hoje`;
    dietStat = `🔥 ${streak} ${streak === 1 ? "dia" : "dias"}`;
  }

  return (
    <div style={styles.page}>
      <div style={{ ...styles.container, paddingBottom: 96 }}>
        <div style={styles.hubHeader}>
          <form action={signOut}>
            <button type="submit" style={styles.signOutBtn}>Sair</button>
          </form>
          <h1 style={styles.hubGreeting}>Hoje</h1>
          <p style={styles.hubSub}>{new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}</p>
        </div>

        <div style={styles.hubCards}>
          <button className="tab-press" style={styles.hubModuleCard} onClick={() => setRoute("treino")}>
            <div style={{ ...styles.hubModuleIcon, background: "rgba(232,255,71,.14)" }}>🏋️</div>
            <div style={styles.hubModuleBody}>
              <div style={styles.hubModuleTitle}>Treino</div>
              <div style={styles.hubModuleSub}>{trainSub}</div>
              {trainStat && <div style={styles.hubModuleStat}>{trainStat}</div>}
            </div>
            <div style={{ color: C.midGray, fontSize: 18, fontWeight: 700 }}>›</div>
          </button>

          <button className="tab-press" style={styles.hubModuleCard} onClick={() => setRoute("dieta")}>
            <div style={{ ...styles.hubModuleIcon, background: "rgba(240,180,41,.14)" }}>🍽️</div>
            <div style={styles.hubModuleBody}>
              <div style={styles.hubModuleTitle}>Dieta</div>
              <div style={styles.hubModuleSub}>{dietSub}</div>
              {dietStat && <div style={{ ...styles.hubModuleStat, color: C.honey }}>{dietStat}</div>}
            </div>
            <div style={{ color: C.midGray, fontSize: 18, fontWeight: 700 }}>›</div>
          </button>
        </div>

        {program && dietPlan && (
          <div style={{ ...styles.dietSectionCard, margin: "16px 20px 0" }}>
            <div style={{ fontFamily: DISPLAY, fontSize: 12, fontWeight: 600, letterSpacing: 1, color: C.midGray, marginBottom: 10 }}>RESUMO DA SEMANA</div>
            <div style={{ fontSize: 12.5, color: C.lightGray, lineHeight: 1.6 }}>
              Treino: {getTrainingStreak(program, trainHistory)} dias seguidos · Dieta: {getDietStreak(dietPlan, todayPicks, dietHistory)} dias seguidos.
            </div>
          </div>
        )}
      </div>

      <div style={styles.hubBottomNav}>
        <button style={{ ...styles.hubNavBtn, ...styles.hubNavBtnActive }} onClick={() => setRoute("hub")}>
          <div style={{ ...styles.hubNavDot, ...styles.hubNavDotActive }} />
          <span>Hoje</span>
        </button>
        <button style={styles.hubNavBtn} onClick={() => setRoute("treino")}>
          <div style={styles.hubNavDot} />
          <span>Treino</span>
        </button>
        <button style={styles.hubNavBtn} onClick={() => setRoute("dieta")}>
          <div style={styles.hubNavDot} />
          <span>Dieta</span>
        </button>
      </div>
    </div>
  );
}
