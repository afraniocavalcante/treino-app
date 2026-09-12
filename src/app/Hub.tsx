"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getActiveProgram, getHistory } from "@/lib/data";
import { getCurrentWeek, getNextWorkoutIndex, getPhaseInfo, getTrainingStreak, isRestDay, formatDate, type Program, type HistoryEntry } from "@/lib/program";
import { getDietDayLogs, getDietMeasurements, getDietPlan, getTodayDietLog, saveTodayDietLog } from "@/lib/dietData";
import { dayTotals, emptyDietDay, getDietStreak, isDayComplete, isMealDone, type DietDayLog, type DietDayPicks, type DietMeasurement, type DietPlan } from "@/lib/diet";
import { getPerfectStreak, getTopBadges, getTotalPerfectDays, getTrainingVolumeByDate, isDeloadPhase } from "@/lib/insights";
import { C, styles } from "@/lib/styles";
import { signOut } from "@/lib/auth";
import WorkoutApp from "./WorkoutApp";
import DietApp from "./DietApp";
import Settings from "./Settings";
import ConsistencyHeatmap from "./ConsistencyHeatmap";
import WeightVolumeChart from "./WeightVolumeChart";
import { MealCard, findNextMeal } from "./dietShared";

type Route = "hub" | "treino" | "dieta" | "settings";
type DietTab = "hoje" | "progresso" | "compras" | "mais";

function capitalizeFirst(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function Ring({ frac, total, color, icon }: { frac: number; total: number; color: string; icon: string }) {
  const deg = total > 0 ? Math.round((frac / total) * 360) : 0;
  return (
    <div style={styles.hubRingCol}>
      <div style={styles.hubRingWrap}>
        <div style={{ ...styles.hubRingMask, background: `conic-gradient(${color} ${deg}deg, rgba(255,255,255,.08) 0)` }} />
        <div style={styles.hubRingIcon}>{icon}</div>
      </div>
      <span style={styles.hubRingFrac}>{frac} de {total}</span>
    </div>
  );
}

export default function Hub() {
  const supabase = createClient();
  const [route, setRoute] = useState<Route>("hub");
  const [autoStartWorkoutId, setAutoStartWorkoutId] = useState<string | undefined>(undefined);
  const [dietEntry, setDietEntry] = useState<{ tab?: DietTab; mealKey?: string }>({});
  const [loading, setLoading] = useState(true);

  const [program, setProgram] = useState<Program | null>(null);
  const [trainHistory, setTrainHistory] = useState<HistoryEntry[]>([]);
  const [dietPlan, setDietPlan] = useState<DietPlan | null>(null);
  const [todayPicks, setTodayPicks] = useState<DietDayPicks>(emptyDietDay());
  const [todaySupplements, setTodaySupplements] = useState<Record<string, boolean>>({});
  const [dietHistory, setDietHistory] = useState<DietDayLog[]>([]);
  const [measurements, setMeasurements] = useState<DietMeasurement[]>([]);
  const [mealExpanded, setMealExpanded] = useState(true);

  useEffect(() => {
    if (route !== "hub") return;
    let cancelled = false;
    (async () => {
      const [p, h, plan, today, dh, ms] = await Promise.all([
        getActiveProgram(supabase),
        getHistory(supabase),
        getDietPlan(supabase),
        getTodayDietLog(supabase),
        getDietDayLogs(supabase),
        getDietMeasurements(supabase),
      ]);
      if (cancelled) return;
      setProgram(p);
      setTrainHistory(h);
      setDietPlan(plan);
      setTodayPicks(today.picks);
      setTodaySupplements(today.supplements);
      setDietHistory(dh);
      setMeasurements(ms);
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

  function goDieta(tab?: DietTab, mealKey?: string) {
    setDietEntry({ tab, mealKey });
    setRoute("dieta");
  }

  function persistTodayPicks(next: DietDayPicks) {
    setTodayPicks(next);
    saveTodayDietLog(supabase, next, todaySupplements).catch((err) => console.error("Falha ao salvar dieta:", err));
  }

  if (route === "treino") return <WorkoutApp onGoHub={() => setRoute("hub")} autoStartWorkoutId={autoStartWorkoutId} />;
  if (route === "dieta") return <DietApp onExit={() => setRoute("hub")} initialTab={dietEntry.tab} initialOpenMealKey={dietEntry.mealKey} />;
  if (route === "settings") return <Settings onExit={() => setRoute("hub")} />;

  if (loading) return <div style={styles.loadingWrap}>Carregando…</div>;

  const todayStr = formatDate(new Date());
  const trainedToday = trainHistory.some((e) => e.date === todayStr);
  const trainedDates = new Set(trainHistory.map((e) => e.date));
  const dietedDates = new Set(dietHistory.filter((h) => dietPlan && isDayComplete(dietPlan, h.picks)).map((h) => h.date));
  if (dietPlan && isDayComplete(dietPlan, todayPicks)) dietedDates.add(todayStr);

  let restToday = false;
  let nextWorkout: Program["workouts"][number] | null = null;
  let week = 0;
  let trainStreak = 0;
  let deload = false;
  if (program) {
    week = getCurrentWeek(program, trainHistory);
    const nextIdx = getNextWorkoutIndex(program, trainHistory);
    nextWorkout = program.workouts[nextIdx] ?? null;
    restToday = isRestDay(program, trainHistory, todayStr);
    trainStreak = getTrainingStreak(program, trainHistory);
    deload = isDeloadPhase(getPhaseInfo(program, week).name);
  }

  const nextMeal = dietPlan ? findNextMeal(dietPlan.meals, todayPicks) : null;
  const dietStreak = dietPlan ? getDietStreak(dietPlan, todayPicks, dietHistory) : 0;
  const totals = dietPlan ? dayTotals(dietPlan, todayPicks) : { kcal: 0, p: 0, c: 0, g: 0 };
  const kcalPct = dietPlan ? Math.min(100, Math.round((totals.kcal / dietPlan.kcalTarget) * 100)) : 0;
  const perfectStreak = getPerfectStreak(trainedDates, dietedDates);
  const totalPerfectDays = getTotalPerfectDays(trainedDates, dietedDates);
  const badges = getTopBadges(perfectStreak, totalPerfectDays);

  const requiredMeals = dietPlan ? dietPlan.meals.filter((m) => m.key !== "sobremesa") : [];
  const mealsDone = requiredMeals.filter((m) => isMealDone(m, todayPicks)).length;
  const suppTotal = dietPlan ? dietPlan.supplements.length : 0;
  const suppDone = dietPlan ? dietPlan.supplements.filter((s) => todaySupplements[s.key]).length : 0;
  const treinoDone = restToday || trainedToday ? 1 : 0;

  const workoutPending = !!(program && !restToday && nextWorkout && !trainedToday);

  return (
    <div style={styles.page}>
      <div style={{ ...styles.container, paddingBottom: 48 }}>
        <div style={styles.hubHeader}>
          <button onClick={() => setRoute("settings")} style={styles.hubHomeBtn}>⚙️</button>
          <button onClick={signOut} style={styles.signOutBtn}>Sair</button>
          <h1 style={styles.hubGreeting}>Hoje</h1>
          <p style={styles.hubSub}>{capitalizeFirst(new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" }))}</p>
          {program && dietPlan && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
              <div style={styles.hubStreakPill}>🔥 {perfectStreak} {perfectStreak === 1 ? "dia perfeito" : "dias perfeitos"}</div>
              {badges.map((b) => (
                <div key={b.id} style={styles.hubBadgePill}>{b.emoji} {b.label}</div>
              ))}
            </div>
          )}
        </div>

        {deload && <div style={styles.hubBanner}>📉 Semana de deload no treino — pode valer manter ou subir levemente as kcal essa semana.</div>}

        {program && dietPlan && (
          <div style={styles.hubTrackCard}>
            <span style={styles.hubTrackLabel}>Seu dia até agora</span>
            <div style={styles.hubRingRow}>
              <Ring frac={treinoDone} total={1} color={C.accent} icon="🏋️" />
              <Ring frac={mealsDone} total={requiredMeals.length} color={C.honey} icon="🍽️" />
              <Ring frac={suppDone} total={suppTotal} color={C.steel} icon="💊" />
            </div>
          </div>
        )}

        {dietPlan && (
          <div style={{ ...styles.hubActionCard, border: `1px solid ${C.honeyEdge}` }} onClick={() => setMealExpanded((v) => !v)}>
            <div style={styles.hubActionHead}>
              <div style={{ ...styles.hubModuleIcon, background: "rgba(240,180,41,.14)" }}>🍽️</div>
              <div style={{ flex: 1 }}>
                <div style={styles.hubModuleTitle}>Dieta</div>
                <div style={styles.hubModuleSub}>{totals.kcal} de {dietPlan.kcalTarget} kcal hoje</div>
                <div style={{ ...styles.hubModuleStat, color: C.honey, marginTop: 2 }}>🔥 {dietStreak} {dietStreak === 1 ? "dia" : "dias"}</div>
              </div>
              <button style={styles.hubViewBtn} onClick={(e) => { e.stopPropagation(); goDieta(); }}>Ver dieta →</button>
            </div>
            <div style={styles.hubKcalTrack}>
              <div style={{ ...styles.hubKcalFill, width: `${kcalPct}%` }} />
            </div>

            {nextMeal && (
              <>
                <div style={styles.hubUpperLabel}>Próxima refeição</div>
                <MealCard
                  meal={nextMeal}
                  picks={todayPicks}
                  isOpen={mealExpanded}
                  onToggleOpen={() => setMealExpanded((v) => !v)}
                  onChange={persistTodayPicks}
                />
              </>
            )}
          </div>
        )}

        {program && (
          <div
            style={{ ...styles.hubCompactRow, border: `1px solid ${workoutPending ? "rgba(232,255,71,.28)" : C.bgHeader}`, cursor: workoutPending ? "pointer" : "default" }}
            onClick={workoutPending ? () => goTreino(nextWorkout!.id) : undefined}
          >
            <div style={styles.hubCompactIcon}>🏋️</div>
            <div style={{ flex: 1 }}>
              <div style={styles.hubCompactTitle}>{restToday ? "Dia de descanso" : nextWorkout ? `${nextWorkout.emoji} ${nextWorkout.name}` : "—"}</div>
              <div style={styles.hubCompactSub}>🔥 {trainStreak} {trainStreak === 1 ? "dia" : "dias"} · Semana {week}/{program.weeks}</div>
            </div>
            {restToday ? (
              <span style={{ fontSize: 11.5, color: C.midGray, flexShrink: 0 }}>Descanso</span>
            ) : trainedToday ? (
              <div style={styles.hubDoneBadge}>✓</div>
            ) : (
              <div style={styles.hubCtaText}><span>Treinar</span><span style={{ fontSize: 14 }}>›</span></div>
            )}
          </div>
        )}

        {program && dietPlan && (
          <>
            <div style={styles.hubRetroLabel}>Retrospectiva</div>
            <ConsistencyHeatmap trainedDates={trainedDates} dietDates={dietedDates} />
            <WeightVolumeChart measurements={measurements} volumeByDate={getTrainingVolumeByDate(trainHistory)} />
            <div style={styles.hubRetroFoot}>{totalPerfectDays} {totalPerfectDays === 1 ? "dia completo" : "dias completos"} (treino + dieta) registrados até agora.</div>
          </>
        )}
      </div>
    </div>
  );
}
