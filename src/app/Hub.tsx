"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getActiveProgram, getHistory } from "@/lib/data";
import { getCurrentWeek, getNextWorkoutIndex, getTrainingStreak, isRestDay, formatDate, type Program, type HistoryEntry } from "@/lib/program";
import { getDietDayLogs, getDietPlan, getTodayDietLog, saveTodayDietLog } from "@/lib/dietData";
import { dayTotals, emptyDietDay, getDietStreak, isDayComplete, type DietDayLog, type DietDayPicks, type DietPlan } from "@/lib/diet";
import { C, DISPLAY, styles } from "@/lib/styles";
import { signOut } from "./actions";
import WorkoutApp from "./WorkoutApp";
import DietApp from "./DietApp";
import ConsistencyHeatmap from "./ConsistencyHeatmap";
import { MealCard, findNextMeal } from "./dietShared";

type Route = "hub" | "treino" | "dieta";

export default function Hub() {
  const supabase = createClient();
  const [route, setRoute] = useState<Route>("hub");
  const [autoStartWorkoutId, setAutoStartWorkoutId] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  const [program, setProgram] = useState<Program | null>(null);
  const [trainHistory, setTrainHistory] = useState<HistoryEntry[]>([]);
  const [dietPlan, setDietPlan] = useState<DietPlan | null>(null);
  const [todayPicks, setTodayPicks] = useState<DietDayPicks>(emptyDietDay());
  const [todaySupplements, setTodaySupplements] = useState<Record<string, boolean>>({});
  const [dietHistory, setDietHistory] = useState<DietDayLog[]>([]);
  const [openMeal, setOpenMeal] = useState(false);

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
      setTodaySupplements(today.supplements);
      setDietHistory(dh);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route]);

  function goTreino(workoutId?: string) {
    setAutoStartWorkoutId(workoutId);
    setRoute("treino");
  }

  function persistTodayPicks(next: DietDayPicks) {
    setTodayPicks(next);
    saveTodayDietLog(supabase, next, todaySupplements).catch((err) => console.error("Falha ao salvar dieta:", err));
  }

  if (route === "treino") return <WorkoutApp onGoHub={() => setRoute("hub")} autoStartWorkoutId={autoStartWorkoutId} />;
  if (route === "dieta") return <DietApp onExit={() => setRoute("hub")} />;

  if (loading) return <div style={styles.loadingWrap}>Carregando…</div>;

  const todayStr = formatDate(new Date());
  const trainedToday = trainHistory.some((e) => e.date === todayStr);
  const trainedDates = new Set(trainHistory.map((e) => e.date));
  const dietedDates = new Set(
    dietHistory.filter((h) => dietPlan && isDayComplete(dietPlan, h.picks)).map((h) => h.date)
  );
  if (dietPlan && isDayComplete(dietPlan, todayPicks)) dietedDates.add(todayStr);

  let restToday = false;
  let nextWorkout: Program["workouts"][number] | null = null;
  let week = 0;
  let trainStreak = 0;
  if (program) {
    week = getCurrentWeek(program, trainHistory);
    const nextIdx = getNextWorkoutIndex(program, trainHistory);
    nextWorkout = program.workouts[nextIdx] ?? null;
    restToday = isRestDay(program, trainHistory, todayStr);
    trainStreak = getTrainingStreak(program, trainHistory);
  }

  const nextMeal = dietPlan ? findNextMeal(dietPlan.meals, todayPicks) : null;
  const dietStreak = dietPlan ? getDietStreak(dietPlan, todayPicks, dietHistory) : 0;
  const totals = dietPlan ? dayTotals(dietPlan, todayPicks) : { kcal: 0, p: 0, c: 0, g: 0 };
  const perfectDays = [...trainedDates].filter((d) => dietedDates.has(d)).length;

  return (
    <div style={styles.page}>
      <div style={{ ...styles.container, paddingBottom: 48 }}>
        <div style={styles.hubHeader}>
          <form action={signOut}>
            <button type="submit" style={styles.signOutBtn}>Sair</button>
          </form>
          <h1 style={styles.hubGreeting}>Hoje</h1>
          <p style={styles.hubSub}>{new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}</p>
        </div>

        <div style={styles.hubCards}>
          {/* Treino */}
          <div style={styles.dietSectionCard}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }} onClick={() => goTreino()}>
              <div style={{ ...styles.hubModuleIcon, background: "rgba(232,255,71,.14)" }}>🏋️</div>
              <div style={{ flex: 1 }}>
                <div style={styles.hubModuleTitle}>Treino</div>
                <div style={styles.hubModuleSub}>
                  {!program ? "Nenhum programa ativo" : restToday ? "Hoje é dia de descanso" : nextWorkout ? `${nextWorkout.emoji} ${nextWorkout.name}` : ""}
                </div>
                {program && <div style={styles.hubModuleStat}>🔥 {trainStreak} {trainStreak === 1 ? "dia" : "dias"} · Semana {week}/{program.weeks}</div>}
              </div>
              <div style={{ color: C.midGray, fontSize: 18, fontWeight: 700 }}>›</div>
            </div>
            {program && !restToday && nextWorkout && (
              <button
                className="tab-press"
                style={{ ...styles.confirmBtn, marginTop: 14, ...(trainedToday ? { background: "rgba(255,255,255,.06)", color: C.midGray, boxShadow: "none" } : {}) }}
                disabled={trainedToday}
                onClick={() => goTreino(nextWorkout!.id)}
              >
                {trainedToday ? "✓ Treino de hoje concluído" : `Treinar: ${nextWorkout.name} →`}
              </button>
            )}
          </div>

          {/* Dieta — próxima refeição, expansível e funcional */}
          {dietPlan && (
            <div style={styles.dietSectionCard}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer", flex: 1 }} onClick={() => setRoute("dieta")}>
                  <div style={{ ...styles.hubModuleIcon, background: "rgba(240,180,41,.14)" }}>🍽️</div>
                  <div>
                    <div style={styles.hubModuleTitle}>Dieta</div>
                    <div style={styles.hubModuleSub}>{totals.kcal} de {dietPlan.kcalTarget} kcal hoje</div>
                    <div style={{ ...styles.hubModuleStat, color: C.honey }}>🔥 {dietStreak} {dietStreak === 1 ? "dia" : "dias"}</div>
                  </div>
                </div>
                <div style={{ color: C.midGray, fontSize: 18, fontWeight: 700 }} onClick={() => setRoute("dieta")}>›</div>
              </div>

              {nextMeal ? (
                <MealCard
                  meal={nextMeal}
                  picks={todayPicks}
                  isOpen={openMeal}
                  onToggleOpen={() => setOpenMeal((v) => !v)}
                  onChange={persistTodayPicks}
                />
              ) : (
                <div style={{ fontSize: 12.5, color: C.midGray, textAlign: "center", padding: "6px 0" }}>Todas as refeições de hoje já foram registradas 🎉</div>
              )}
            </div>
          )}
        </div>

        {program && dietPlan && (
          <>
            <ConsistencyHeatmap trainedDates={trainedDates} dietDates={dietedDates} />
            <div style={{ ...styles.dietSectionCard, margin: "16px 20px 0" }}>
              <div style={{ fontFamily: DISPLAY, fontSize: 12, fontWeight: 600, letterSpacing: 1, color: C.midGray, marginBottom: 8 }}>RESUMO</div>
              <div style={{ fontSize: 12.5, color: C.lightGray, lineHeight: 1.6 }}>
                {perfectDays} {perfectDays === 1 ? "dia completo" : "dias completos"} (treino + dieta) registrados até agora.
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
