"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getActiveProgram, getHistory, getLastWeights, persistWorkoutSession } from "@/lib/data";
import { getCurrentWeek, getNextWorkoutIndex, getPhaseInfo, isRestDay, formatDate, type Program, type HistoryEntry } from "@/lib/program";
import { drainPendingSessions, onSessionReceived, type WatchCompletedSession } from "@/lib/watchBridge";
import { getDietDayLogs, getDietMeasurements, getDietPlan, getTodayDietLog, saveTodayDietLog } from "@/lib/dietData";
import { emptyDietDay, isDayFullyComplete, type DietDayLog, type DietDayPicks, type DietMeasurement, type DietPlan } from "@/lib/diet";
import { getPerfectStreak, getTotalPerfectDays, getTrainingVolumeByDate, isDeloadPhase } from "@/lib/insights";
import { guardOffline, loadWithCache, useOnline } from "@/lib/offline";
import { getStoredWallpaper, wallpaperBackground, type WallpaperId } from "@/lib/wallpaper";
import WorkoutApp from "./WorkoutApp";
import DietApp from "./DietApp";
import Settings from "./Settings";
import Insights from "./Insights";
import TravelApp from "./travel/TravelApp";
import Dock, { OS_APPS, type OSApp } from "./os/Dock";
import Library from "./os/Library";
import FullScreenApp from "./os/FullScreenApp";
import Today from "./os/Today";

type Route = "hub" | "treino" | "dieta" | "viagens" | "settings" | "insights";
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

const ROUTE_TO_APP: Record<Route, OSApp> = { hub: "hoje", dieta: "dieta", treino: "treino", viagens: "viagens", insights: "insights", settings: "ajustes" };
const APP_TO_ROUTE: Record<OSApp, Route> = { hoje: "hub", dieta: "dieta", treino: "treino", viagens: "viagens", insights: "insights", ajustes: "settings" };

const PHOSPHOR_FILL_CSS = "https://unpkg.com/@phosphor-icons/web@2.1.1/src/fill/style.css";

export default function Hub() {
  const supabase = createClient();
  const [route, setRoute] = useState<Route>("hub");
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [wallpaper, setWallpaper] = useState<WallpaperId>(() => getStoredWallpaper());
  const [autoStartWorkoutId, setAutoStartWorkoutId] = useState<string | undefined>(undefined);
  const [insightsSessionId, setInsightsSessionId] = useState<string | undefined>(undefined);
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

  /** Deep link do Treino (treino já feito hoje / "Ver treino feito hoje") pro detalhe dessa sessão em Insights. */
  function goInsightsSession(entryId: string) {
    setInsightsSessionId(entryId);
    setRoute("insights");
  }

  function goSettings(tab?: SettingsTab) {
    // Only overrides the sub-tab on an explicit deep link (e.g. "Programas"
    // in Treino) — abrir Ajustes pela Biblioteca mantém a sub-aba que
    // Settings já estava mostrando, já que ele fica sempre montado e seu
    // próprio initialTab não "reseta" sozinho sem essa guarda.
    if (tab) setSettingsTab(tab);
    setRoute("settings");
  }

  /** Um único ponto de entrada pra abrir qualquer app — usado pelo Dock, pela Biblioteca e por Hoje. */
  function openApp(app: OSApp) {
    setLibraryOpen(false);
    if (app === "dieta") goDieta();
    else if (app === "treino") goTreino();
    else if (app === "ajustes") goSettings();
    else setRoute(APP_TO_ROUTE[app]);
  }

  function toggleTodaySupplement(key: string) {
    if (guardOffline(online)) return;
    const next = { ...todaySupplements, [key]: !todaySupplements[key] };
    setTodaySupplements(next);
    saveTodayDietLog(supabase, todayPicks, next).catch((err) => console.error("Falha ao salvar suplementos:", err));
  }

  function persistTodayPicks(next: DietDayPicks) {
    if (guardOffline(online)) return;
    setTodayPicks(next);
    saveTodayDietLog(supabase, next, todaySupplements).catch((err) => console.error("Falha ao salvar dieta:", err));
  }

  const activeApp = ROUTE_TO_APP[route];

  const todayStr = formatDate(new Date());
  const trainedToday = trainHistory.some((e) => e.date === todayStr);
  const trainedDates = new Set(trainHistory.map((e) => e.date));
  const dietedDates = new Set(dietHistory.filter((h) => dietPlan && isDayFullyComplete(dietPlan, h.picks, h.supplements)).map((h) => h.date));
  const todayFullyDone = !!dietPlan && isDayFullyComplete(dietPlan, todayPicks, todaySupplements);
  if (todayFullyDone) dietedDates.add(todayStr);

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
  void week;

  const perfectStreak = getPerfectStreak(trainedDates, dietedDates);
  const totalPerfectDays = getTotalPerfectDays(trainedDates, dietedDates);

  return (
    <div style={{ position: "relative", height: "100%", width: "100%", maxWidth: 440, margin: "0 auto", overflow: "hidden", background: "#EAD7BE", fontFamily: "'Sora',-apple-system,sans-serif" }}>
      <link rel="stylesheet" href={PHOSPHOR_FILL_CSS} />
      <div style={{ position: "absolute", inset: 0, background: wallpaperBackground(wallpaper) }} />

      {loading ? (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#78716C", fontSize: 13 }}>Carregando…</div>
      ) : (
        <Today
          supabase={supabase}
          program={program}
          dietPlan={dietPlan}
          todayPicks={todayPicks}
          todaySupplements={todaySupplements}
          restToday={restToday}
          trainedToday={trainedToday}
          perfectStreak={perfectStreak}
          todayFullyDone={todayFullyDone}
          offline={!online || usingCache}
          deload={deload}
          onOpenApp={openApp}
          onOpenTreino={() => goTreino(nextWorkout?.id)}
          onToggleSupplement={toggleTodaySupplement}
          onPersistPicks={persistTodayPicks}
        />
      )}

      <FullScreenApp show={route === "dieta"} page={OS_APPS.dieta.page} name={OS_APPS.dieta.name} sub="Refeições e suplementos do dia" action="Registrar" onClose={() => setRoute("hub")}>
        <DietApp onExit={() => setRoute("hub")} initialTab={dietEntry.tab} initialOpenMealKey={dietEntry.mealKey} />
      </FullScreenApp>

      <FullScreenApp show={route === "treino"} page={OS_APPS.treino.page} name={OS_APPS.treino.name} sub={program ? `Programa · ${program.name}` : "Programa de treino"} onClose={() => setRoute("hub")}>
        <WorkoutApp
          onGoHub={() => setRoute("hub")}
          onOpenProgramSettings={() => goSettings("treino")}
          onViewSession={goInsightsSession}
          autoStartWorkoutId={autoStartWorkoutId}
        />
      </FullScreenApp>

      <FullScreenApp show={route === "viagens"} page={OS_APPS.viagens.page} name={OS_APPS.viagens.name} sub="Próxima viagem" onClose={() => setRoute("hub")}>
        <TravelApp />
      </FullScreenApp>

      <FullScreenApp show={route === "insights"} page={OS_APPS.insights.page} name={OS_APPS.insights.name} sub="Dieta e treino, histórico" onClose={() => setRoute("hub")}>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "#8A857F", fontSize: 13 }}>Carregando…</div>
        ) : (
          <Insights
            perfectStreak={perfectStreak}
            totalPerfectDays={totalPerfectDays}
            trainedDates={trainedDates}
            dietedDates={dietedDates}
            measurements={measurements}
            volumeByDate={getTrainingVolumeByDate(trainHistory)}
            onStartWorkout={goTreino}
            openSessionId={insightsSessionId}
          />
        )}
      </FullScreenApp>

      <FullScreenApp show={route === "settings"} page={OS_APPS.ajustes.page} name={OS_APPS.ajustes.name} sub="Personal OS" onClose={() => setRoute("hub")}>
        <Settings onExit={() => setRoute("hub")} initialTab={settingsTab} onWallpaperChange={setWallpaper} />
      </FullScreenApp>

      <Library open={libraryOpen} onClose={() => setLibraryOpen(false)} onOpenApp={openApp} />

      <Dock active={activeApp} libraryOpen={libraryOpen} onChange={openApp} onOpenLibrary={() => setLibraryOpen(true)} />
    </div>
  );
}
