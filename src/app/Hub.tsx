"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getActiveProgram, getHistory, getLastWeights, persistWorkoutSession } from "@/lib/data";
import { getCurrentWeek, getNextWorkoutIndex, getPhaseInfo, isRestDay, formatDate, type Program, type HistoryEntry } from "@/lib/program";
import { drainPendingSessions, onSessionReceived, type WatchCompletedSession } from "@/lib/watchBridge";
import { getDietDayLogs, getDietMeasurements, getDietPlan, getTodayDietLog, saveTodayDietLog } from "@/lib/dietData";
import { emptyDietDay, isDayFullyComplete, isMealDone, type DietDayLog, type DietDayPicks, type DietMeasurement, type DietPlan } from "@/lib/diet";
import { getPerfectStreak, getTotalPerfectDays, getTrainingVolumeByDate, isDeloadPhase } from "@/lib/insights";
import { C, SCREEN_ANIM, styles } from "@/lib/styles";
import { guardOffline, loadWithCache, useOnline } from "@/lib/offline";
import WorkoutApp from "./WorkoutApp";
import DietApp from "./DietApp";
import Settings from "./Settings";
import Insights from "./Insights";
import TabBar, { TABS, type AppTab } from "./TabBar";
import { useHorizontalTabSwipe } from "@/lib/gestures";
import ConsistencyHeatmap from "./ConsistencyHeatmap";
import { MealCard, findNextMeal } from "./dietShared";
import { CheckIcon, DumbbellIcon, PlateIcon, SupplementIcon, WarningIcon } from "./Icons";

type Route = "hub" | "treino" | "dieta" | "settings" | "insights";
type DietTab = "hoje" | "progresso" | "compras" | "mais";
type SettingsTab = "dieta" | "treino";

interface HubBundle {
  p: Program | null;
  h: HistoryEntry[];
  plan: DietPlan | null;
  today: { picks: DietDayPicks; supplements: Record<string, boolean> };
  dh: DietDayLog[];
  ms: DietMeasurement[];
}

function capitalizeFirst(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function Ring({ frac, total, color, label }: { frac: number; total: number; color: string; label: string }) {
  const deg = total > 0 ? Math.round((frac / total) * 360) : 0;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <div style={{ width: 46, height: 46, borderRadius: "50%", background: `conic-gradient(${color} ${deg}deg, rgba(13,27,42,.08) 0)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 37, height: 37, borderRadius: "50%", background: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10.5, fontWeight: 700, color: C.white }}>
          {frac}/{total}
        </div>
      </div>
      <span style={{ fontSize: 9.5, fontWeight: 700, color: C.lightGray }}>{label}</span>
    </div>
  );
}

export default function Hub() {
  const supabase = createClient();
  const [route, setRoute] = useState<Route>("hub");
  const [autoStartWorkoutId, setAutoStartWorkoutId] = useState<string | undefined>(undefined);
  const [dietEntry, setDietEntry] = useState<{ tab?: DietTab; mealKey?: string }>({});
  const [settingsTab, setSettingsTab] = useState<SettingsTab>("dieta");
  const [loading, setLoading] = useState(true);

  const [program, setProgram] = useState<Program | null>(null);
  const [trainHistory, setTrainHistory] = useState<HistoryEntry[]>([]);
  const [dietPlan, setDietPlan] = useState<DietPlan | null>(null);
  const [todayPicks, setTodayPicks] = useState<DietDayPicks>(emptyDietDay());
  const [todaySupplements, setTodaySupplements] = useState<Record<string, boolean>>({});
  const [dietHistory, setDietHistory] = useState<DietDayLog[]>([]);
  const [measurements, setMeasurements] = useState<DietMeasurement[]>([]);
  const [mealExpanded, setMealExpanded] = useState(false);
  const [suppExpanded, setSuppExpanded] = useState(false);
  const [usingCache, setUsingCache] = useState(false);
  const online = useOnline();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, offline } = await loadWithCache<HubBundle>("hub", async () => {
        const [p, h, plan, today, dh, ms] = await Promise.all([
          getActiveProgram(supabase),
          getHistory(supabase),
          getDietPlan(supabase),
          getTodayDietLog(supabase),
          getDietDayLogs(supabase),
          getDietMeasurements(supabase),
        ]);
        return { p, h, plan, today, dh, ms };
      }, online);
      if (cancelled) return;
      setProgram(data.p);
      setTrainHistory(data.h);
      setDietPlan(data.plan);
      setTodayPicks(data.today.picks);
      setTodaySupplements(data.today.supplements);
      setDietHistory(data.dh);
      setMeasurements(data.ms);
      setUsingCache(offline);
      setLoading(false);
    })().catch(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sessions trained on the Apple Watch arrive via WatchConnectivity (native
  // plugin, see WatchBridgePlugin.swift) — refs avoid resubscribing every time
  // program/trainHistory change, since this listener is set up once.
  const programRef = useRef<Program | null>(null);
  const trainHistoryRef = useRef<HistoryEntry[]>([]);
  useEffect(() => {
    programRef.current = program;
  }, [program]);
  useEffect(() => {
    trainHistoryRef.current = trainHistory;
  }, [trainHistory]);

  useEffect(() => {
    async function processCompletedSession(session: WatchCompletedSession) {
      const activeProgram = programRef.current;
      if (!activeProgram || activeProgram.id !== session.programId) return;
      const entry = {
        date: session.date,
        week: getCurrentWeek(activeProgram, trainHistoryRef.current),
        programId: session.programId,
        programWorkoutId: session.programWorkoutId,
        workoutLabel: session.workoutLabel,
        workoutEmoji: session.workoutEmoji ?? "",
        sessionLabel: session.sessionLabel,
        exercises: session.exercises,
      };
      const lastWeights = await getLastWeights(supabase);
      const { id } = await persistWorkoutSession(supabase, entry, lastWeights);
      setTrainHistory((prev) => [...prev, { id, ...entry }]);
    }

    async function drainAndProcess() {
      const sessions = await drainPendingSessions();
      for (const session of sessions) {
        await processCompletedSession(session).catch((err) =>
          console.error("Falha ao salvar sessão vinda do Apple Watch:", err)
        );
      }
    }

    drainAndProcess();
    const listenerPromise = onSessionReceived(() => {
      drainAndProcess();
    });

    return () => {
      listenerPromise.then((handle) => handle.remove());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function goTreino(workoutId?: string) {
    setAutoStartWorkoutId(workoutId);
    setRoute("treino");
  }

  function goDieta(tab?: DietTab, mealKey?: string) {
    setDietEntry({ tab, mealKey });
    setRoute("dieta");
  }

  function goSettings(tab?: SettingsTab) {
    // Only overrides the sub-tab on an explicit deep link (e.g. "Programas"
    // in Treino) — a bare tap on the Config tab bar button keeps whatever
    // sub-tab Settings was last showing, since Settings stays mounted and
    // its own initialTab prop can't "reset" it without this guard.
    if (tab) setSettingsTab(tab);
    setRoute("settings");
  }

  function persistTodayPicks(next: DietDayPicks) {
    if (guardOffline(online)) return;
    setTodayPicks(next);
    saveTodayDietLog(supabase, next, todaySupplements).catch((err) => console.error("Falha ao salvar dieta:", err));
  }

  function toggleTodaySupplement(key: string) {
    if (guardOffline(online)) return;
    const next = { ...todaySupplements, [key]: !todaySupplements[key] };
    setTodaySupplements(next);
    saveTodayDietLog(supabase, todayPicks, next).catch((err) => console.error("Falha ao salvar suplementos:", err));
  }

  const activeTab: AppTab =
    route === "hub" ? "hub" : route === "dieta" ? "dieta" : route === "treino" ? "treino" : route === "insights" ? "insights" : "settings";

  function handleTabChange(tab: AppTab) {
    if (tab === "hub") setRoute("hub");
    else if (tab === "dieta") goDieta();
    else if (tab === "treino") goTreino();
    else if (tab === "insights") setRoute("insights");
    else goSettings();
  }

  // Deslizar sobre o conteúdo troca de módulo, na mesma ordem da TabBar —
  // mesmo handleTabChange que um toque na aba já chama.
  const scrollRef = useRef<HTMLDivElement>(null);
  useHorizontalTabSwipe(
    scrollRef,
    () => {
      const idx = TABS.findIndex((t) => t.key === activeTab);
      if (idx >= 0 && idx < TABS.length - 1) handleTabChange(TABS[idx + 1].key);
    },
    () => {
      const idx = TABS.findIndex((t) => t.key === activeTab);
      if (idx > 0) handleTabChange(TABS[idx - 1].key);
    }
  );

  const todayStr = formatDate(new Date());
  const trainedToday = trainHistory.some((e) => e.date === todayStr);
  const trainedDates = new Set(trainHistory.map((e) => e.date));
  const dietedDates = new Set(dietHistory.filter((h) => dietPlan && isDayFullyComplete(dietPlan, h.picks, h.supplements)).map((h) => h.date));
  if (dietPlan && isDayFullyComplete(dietPlan, todayPicks, todaySupplements)) dietedDates.add(todayStr);

  let restToday = false;
  let nextWorkout: Program["workouts"][number] | null = null;
  let week = 0;
  let deload = false;
  if (program) {
    week = getCurrentWeek(program, trainHistory);
    const nextIdx = getNextWorkoutIndex(program, trainHistory);
    nextWorkout = program.workouts[nextIdx] ?? null;
    restToday = isRestDay(program, trainHistory, todayStr);
    deload = isDeloadPhase(getPhaseInfo(program, week).name);
  }

  const nextMeal = dietPlan ? findNextMeal(dietPlan.meals, todayPicks) : null;
  const perfectStreak = getPerfectStreak(trainedDates, dietedDates);
  const totalPerfectDays = getTotalPerfectDays(trainedDates, dietedDates);

  const requiredMeals = dietPlan ? dietPlan.meals.filter((m) => m.key !== "sobremesa") : [];
  const mealsDone = requiredMeals.filter((m) => isMealDone(m, todayPicks)).length;
  const suppTotal = dietPlan ? dietPlan.supplements.length : 0;
  const suppDone = dietPlan ? dietPlan.supplements.filter((s) => todaySupplements[s.key]).length : 0;
  const treinoDone = restToday || trainedToday ? 1 : 0;

  const workoutPending = !!(program && !restToday && nextWorkout && !trainedToday);

  // CSS reinicia a animação sozinho toda vez que o display volta de none pra
  // block — não precisa de key/remount, e a mesma "leveza" que só existia ao
  // abrir o Treino agora entra em qualquer troca de módulo.
  const routeStyle = (r: Route) => (route === r ? { display: "block" as const, animation: SCREEN_ANIM } : { display: "none" as const });

  return (
    <div style={styles.appShell}>
    <div style={styles.appShellScroll} ref={scrollRef}>
    <div style={routeStyle("hub")}>
    {loading ? (
      <div style={styles.loadingWrap}>Carregando…</div>
    ) : (
    <div style={styles.container}>
        <div style={{ padding: "26px 22px 2px" }}>
          <h1 style={{ ...styles.hubGreeting, fontSize: 20 }}>{capitalizeFirst(new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" }))}</h1>
        </div>

        {(!online || usingCache) && (
          <div style={styles.offlineBanner}>📡 Sem conexão — modo de visualização, mudanças não serão salvas agora.</div>
        )}

        {deload && (
          <div style={{ margin: "8px 20px 0", padding: "7px 13px", borderRadius: 7, background: C.bgCard, border: `1px solid ${C.bgHeader}`, borderLeft: `3px solid ${C.steel}`, display: "flex", gap: 8, alignItems: "center" }}>
            <WarningIcon size={13} color={C.steel} />
            <span style={{ fontSize: 11, color: C.lightGray, lineHeight: 1.35 }}>Semana de deload no treino — pode valer manter ou subir levemente as kcal essa semana.</span>
          </div>
        )}

        {program && dietPlan && (
          <div style={{ borderRadius: 10, padding: 12, margin: "8px 20px 0", background: C.bgCard, border: `1px solid ${C.bgHeader}`, display: "flex", justifyContent: "space-around" }}>
            <Ring frac={treinoDone} total={1} color={C.accent} label="Treino" />
            <Ring frac={mealsDone} total={requiredMeals.length} color={C.honey} label="Refeições" />
            <Ring frac={suppDone} total={suppTotal} color={C.steel} label="Suplementos" />
          </div>
        )}

        {dietPlan && (
          <div style={{ borderRadius: 10, margin: "8px 20px 0", background: C.bgCard, border: `1px solid ${C.bgHeader}`, borderLeft: `4px solid ${C.honey}`, overflow: "hidden" }}>
            <div style={{ padding: "10px 15px" }}>
              <div onClick={() => setMealExpanded((v) => !v)} style={{ display: "flex", alignItems: "center", gap: 11, cursor: "pointer" }}>
                <div style={{ width: 36, height: 36, borderRadius: 7, background: C.honey, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <PlateIcon size={17} color={C.cream} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: 0.5, color: C.midGray, textTransform: "uppercase" }}>Próxima refeição</div>
                  <div style={{ fontSize: 14.5, fontWeight: 600 }}>{nextMeal ? nextMeal.label : "Tudo escolhido hoje"}</div>
                </div>
                <a
                  href="#"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); goDieta(); }}
                  style={{ fontSize: 10.5, fontWeight: 600, color: C.lightGray, marginRight: 2 }}
                >
                  Ver dieta →
                </a>
              </div>
              {nextMeal && (
                <div style={{ marginTop: 12 }}>
                  <MealCard
                    meal={nextMeal}
                    picks={todayPicks}
                    isOpen={mealExpanded}
                    onToggleOpen={() => setMealExpanded((v) => !v)}
                    onChange={persistTodayPicks}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {dietPlan && dietPlan.supplements.length > 0 && (
          <div style={{ borderRadius: 10, margin: "8px 20px 0", background: C.bgCard, border: `1px solid ${C.bgHeader}`, borderLeft: `4px solid ${C.steel}`, overflow: "hidden" }}>
            <div style={{ padding: "10px 15px" }}>
              <div onClick={() => setSuppExpanded((v) => !v)} style={{ display: "flex", alignItems: "center", gap: 11, cursor: "pointer" }}>
                <div style={{ width: 36, height: 36, borderRadius: 7, background: C.steel, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <SupplementIcon size={16} color={C.cream} markColor={C.steel} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: 0.5, color: C.midGray, textTransform: "uppercase" }}>Suplementos</div>
                  <div style={{ fontSize: 14.5, fontWeight: 600 }}>{suppDone} de {suppTotal} hoje</div>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateRows: suppExpanded ? "1fr" : "0fr", transition: "grid-template-rows .28s ease" }}>
                <div style={{ overflow: "hidden", minHeight: 0 }}>
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.line}`, display: "flex", flexDirection: "column", gap: 6 }}>
                    {dietPlan.supplements.map((s) => {
                      const checked = !!todaySupplements[s.key];
                      return (
                        <div key={s.key} onClick={() => toggleTodaySupplement(s.key)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: 6, cursor: "pointer" }}>
                          <div style={{ ...styles.dietRadio, ...(checked ? { border: "none", background: C.steel } : {}) }}>{checked && <CheckIcon size={9} />}</div>
                          <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{s.label}</span>
                          {s.timing && <span style={{ fontSize: 11, fontWeight: 700, color: C.lightGray }}>{s.timing}</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {program && (
          <div
            onClick={workoutPending ? () => goTreino(nextWorkout!.id) : undefined}
            style={{ borderRadius: 10, padding: "10px 15px", margin: "8px 20px 0", background: C.bgCard, border: `1px solid ${C.bgHeader}`, borderLeft: `4px solid ${workoutPending ? C.accent : "rgba(13,27,42,.12)"}`, display: "flex", alignItems: "center", gap: 11, cursor: workoutPending ? "pointer" : "default" }}
          >
            <div style={{ width: 36, height: 36, borderRadius: 7, background: C.accent, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <DumbbellIcon size={16} color={C.cream} />
            </div>
            <span style={{ fontSize: 14, fontWeight: 600 }}>{restToday ? "Dia de descanso" : nextWorkout ? nextWorkout.name : "—"}</span>
            <span style={{ display: "flex", alignItems: "center", gap: 5, marginLeft: "auto", color: restToday ? C.midGray : trainedToday ? C.midGray : C.honey, fontSize: 12, fontWeight: 700 }}>
              {restToday ? "Descanso" : trainedToday ? "✓ Feito" : "Treinar ›"}
            </span>
          </div>
        )}

        {program && dietPlan && (
          <ConsistencyHeatmap trainedDates={trainedDates} dietDates={dietedDates} weeks={12} onTitleClick={() => setRoute("insights")} />
        )}
    </div>
    )}
    </div>

    <div style={routeStyle("dieta")}>
      <DietApp onExit={() => setRoute("hub")} initialTab={dietEntry.tab} initialOpenMealKey={dietEntry.mealKey} />
    </div>

    <div style={routeStyle("treino")}>
      <WorkoutApp onGoHub={() => setRoute("hub")} onOpenProgramSettings={() => goSettings("treino")} autoStartWorkoutId={autoStartWorkoutId} />
    </div>

    <div style={routeStyle("insights")}>
      {loading ? (
        <div style={styles.loadingWrap}>Carregando…</div>
      ) : (
        <Insights
          perfectStreak={perfectStreak}
          totalPerfectDays={totalPerfectDays}
          trainedDates={trainedDates}
          dietedDates={dietedDates}
          measurements={measurements}
          volumeByDate={getTrainingVolumeByDate(trainHistory)}
        />
      )}
    </div>

    <div style={routeStyle("settings")}>
      <Settings onExit={() => setRoute("hub")} initialTab={settingsTab} />
    </div>
    </div>

    <TabBar active={activeTab} onChange={handleTabChange} />
    </div>
  );
}
