"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  getActiveProgram,
  getExerciseLibrary,
  getHistory,
  getLastWeights,
  getProgramSequence,
  getScheduledProgram,
  persistWorkoutSession,
} from "@/lib/data";
import {
  formatDate,
  formatDateDisplay,
  getCurrentWeek,
  getExerciseSeries,
  getNextWorkoutIndex,
  getPhaseInfo,
  getSessionLabel,
  getTrainedDateSet,
  getTrainingStreak,
  getTrainingWeekMap,
  isRestDay,
  parseTopReps,
  type HistoryEntry,
  type LibraryExercise,
  type Program,
  type ProgramWorkout,
  type ProgramWorkoutExercise,
  type SessionLog,
} from "@/lib/program";
import { C, DISPLAY, EASE, G, styles } from "@/lib/styles";
import { cancelRestTimerNotification, isNativePlatform, scheduleRecoveryMealNudge, scheduleRestTimerNotification } from "@/lib/notifications";
import { guardOffline, loadWithCache, useOnline } from "@/lib/offline";
import { sendTodayWorkout } from "@/lib/watchBridge";
import ProgressChart from "./ProgressChart";
import Heatmap from "./Heatmap";

const RING_R = 44;
const RING_CIRC = 2 * Math.PI * RING_R;
const PHASE_OUT_MS = 170;
const MONTH_NAMES_FULL = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

type Screen = "home" | "workout" | "done" | "history" | "conflict" | "preview" | "stats";
type Phase = "active" | "rest" | "input" | "hold";

interface WorkoutBundle {
  p: Program | null;
  lib: LibraryExercise[];
  h: HistoryEntry[];
  w: Record<string, number>;
  sp: Program | null;
  seq: [string, number][]; // Map doesn't survive JSON (de)serialization for the offline cache
}

function initialPhaseFor(ex: ProgramWorkoutExercise): Phase {
  if (ex.holdSeconds) return "active";
  if (ex.unit === "corpo") return "active";
  return "input";
}

export default function WorkoutApp({
  onGoHub,
  onOpenProgramSettings,
  autoStartWorkoutId,
}: { onGoHub?: () => void; onOpenProgramSettings?: () => void; autoStartWorkoutId?: string } = {}) {
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [screen, setScreen] = useState<Screen>("home");
  const [program, setProgram] = useState<Program | null>(null);
  const [scheduledProgram, setScheduledProgram] = useState<Program | null>(null);
  const [library, setLibrary] = useState<LibraryExercise[]>([]);
  const [activeWorkoutId, setActiveWorkoutId] = useState<string | null>(null);
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [currentSet, setCurrentSet] = useState(0);
  const [phase, setPhase] = useState<Phase>("active");
  const [phaseExiting, setPhaseExiting] = useState(false);
  const [phaseTick, setPhaseTick] = useState(0);
  const [screenTick, setScreenTick] = useState(0);
  const [restTime, setRestTime] = useState(0);
  const [restTotal, setRestTotal] = useState(0);
  const [kgInput, setKgInput] = useState("");
  const [repsInput, setRepsInput] = useState("");
  const [sessionLog, setSessionLog] = useState<SessionLog>({});
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyView, setHistoryView] = useState<HistoryEntry | null>(null);
  const [historyViewOrigin, setHistoryViewOrigin] = useState<"home" | "history">("history");
  const [conflictWorkout, setConflictWorkout] = useState<ProgramWorkout | null>(null);
  const [previewWorkout, setPreviewWorkout] = useState<ProgramWorkout | null>(null);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const [historyFilter, setHistoryFilter] = useState<string | null>(null);
  const [chartMetric, setChartMetric] = useState<"carga" | "volume" | "frequencia">("carga");
  const [completedExercises, setCompletedExercises] = useState<Set<number>>(new Set());
  const [lastWeights, setLastWeights] = useState<Record<string, number>>({});
  const [sessionLabel, setSessionLabel] = useState("");
  const [holdTime, setHoldTime] = useState(0);
  const [saving, setSaving] = useState(false);
  const [gifModalUrl, setGifModalUrl] = useState<string | null>(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [programSeq, setProgramSeq] = useState<Map<string, number>>(new Map());

  const [usingCache, setUsingCache] = useState(false);
  const online = useOnline();

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const phaseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function loadAll() {
    const { data, offline } = await loadWithCache<WorkoutBundle>("workout", async () => {
      const [p, lib, h, w, sp, seq] = await Promise.all([
        getActiveProgram(supabase),
        getExerciseLibrary(supabase),
        getHistory(supabase),
        getLastWeights(supabase),
        getScheduledProgram(supabase),
        getProgramSequence(supabase),
      ]);
      return { p, lib, h, w, sp, seq: Array.from(seq.entries()) };
    }, online);
    setProgram(data.p);
    setLibrary(data.lib);
    setHistory(data.h);
    setLastWeights(data.w);
    setScheduledProgram(data.sp);
    setProgramSeq(new Map(data.seq));
    setUsingCache(offline);
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
      if (timerRef.current) clearInterval(timerRef.current);
      if (holdTimerRef.current) clearInterval(holdTimerRef.current);
      if (phaseTimeoutRef.current) clearTimeout(phaseTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const autoStartedRef = useRef(false);
  useEffect(() => {
    if (loading || autoStartedRef.current || !autoStartWorkoutId || !program) return;
    const workout = program.workouts.find((w) => w.id === autoStartWorkoutId);
    if (workout) {
      autoStartedRef.current = true;
      startWorkout(workout);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, program, autoStartWorkoutId]);

  // Keeps the Apple Watch app in sync with "today's workout" — sent again
  // whenever the underlying data changes (e.g. after finishing a session,
  // getNextWorkoutIndex rotates to the next one).
  useEffect(() => {
    if (loading || !program || !isNativePlatform()) return;
    const nextIdx = getNextWorkoutIndex(program, history);
    const workout = program.workouts[nextIdx];
    if (!workout) return;
    sendTodayWorkout({
      programId: program.id,
      programWorkoutId: workout.id,
      workoutLabel: workout.name,
      workoutEmoji: workout.emoji,
      sessionLabel: getSessionLabel(program, workout, history),
      exercises: workout.exercises.map((ex) => ({
        id: ex.exerciseId,
        name: ex.name,
        unit: ex.unit,
        sets: ex.sets,
        reps: ex.reps,
        restSeconds: ex.restSeconds ?? program.restSeconds,
        lastKg: lastWeights[ex.exerciseId] ?? null,
      })),
    });
  }, [loading, program, history, lastWeights]);

  const currentWorkout = program?.workouts.find((w) => w.id === activeWorkoutId) ?? null;

  async function persistSession(log: SessionLog, workout: ProgramWorkout) {
    if (!program) return;
    if (guardOffline(online)) return;
    const entry = {
      date: formatDate(new Date()),
      week: getCurrentWeek(program, history),
      programId: program.id,
      programWorkoutId: workout.id,
      workoutLabel: workout.name,
      workoutEmoji: workout.emoji,
      sessionLabel,
      exercises: log,
    };
    setSaving(true);
    try {
      const { id, lastWeights: newLastWeights } = await persistWorkoutSession(supabase, entry, lastWeights);
      setHistory((prev) => [...prev, { id, ...entry }]);
      setLastWeights(newLastWeights);
      scheduleRecoveryMealNudge();
    } finally {
      setSaving(false);
    }
  }

  function goScreen(next: Screen) {
    setGifModalUrl(null);
    setShowExitConfirm(false);
    setScreenTick((t) => t + 1);
    setScreen(next);
  }

  function toPhase(next: Phase, after?: () => void) {
    setGifModalUrl(null);
    setPhaseExiting(true);
    if (phaseTimeoutRef.current) clearTimeout(phaseTimeoutRef.current);
    phaseTimeoutRef.current = setTimeout(() => {
      if (after) after();
      setPhase(next);
      setPhaseExiting(false);
      setPhaseTick((t) => t + 1);
    }, PHASE_OUT_MS);
  }

  function startWorkout(workout: ProgramWorkout) {
    if (!program || workout.exercises.length === 0) return;
    if (guardOffline(online)) return;
    const firstEx = workout.exercises[0];
    const firstPhase = initialPhaseFor(firstEx);
    setActiveWorkoutId(workout.id);
    setExerciseIndex(0);
    setCurrentSet(0);
    setPhase(firstPhase);
    setKgInput(firstPhase === "input" && lastWeights[firstEx.exerciseId] ? String(lastWeights[firstEx.exerciseId]) : "");
    setRepsInput(firstPhase === "input" ? String(parseTopReps(firstEx.reps) ?? "") : "");
    setPhaseExiting(false);
    setSessionLog({});
    setCompletedExercises(new Set());
    setSessionLabel(getSessionLabel(program, workout, history));
    goScreen("workout");
  }

  function getCurrentExercise(): ProgramWorkoutExercise | null {
    if (!currentWorkout) return null;
    return currentWorkout.exercises[exerciseIndex] ?? null;
  }

  function findNextExercise(fromIdx: number, completed: Set<number> = completedExercises): number {
    if (!currentWorkout) return -1;
    const exercises = currentWorkout.exercises;
    for (let i = fromIdx + 1; i < exercises.length; i++) if (!completed.has(i)) return i;
    for (let i = 0; i <= fromIdx; i++) if (!completed.has(i)) return i;
    return -1;
  }

  function goToStep(nextIdx: number, nextSet: number) {
    if (!currentWorkout) return;
    const nextEx = currentWorkout.exercises[nextIdx];
    const nextPhase = initialPhaseFor(nextEx);
    toPhase(nextPhase, () => {
      setExerciseIndex(nextIdx);
      setCurrentSet(nextSet);
      if (nextPhase === "input") {
        const loggedSets = sessionLog[nextEx.exerciseId];
        const lastLogged = loggedSets && loggedSets.length > 0 ? loggedSets[loggedSets.length - 1] : undefined;
        const prefillKg = lastLogged?.kg ?? lastWeights[nextEx.exerciseId];
        setKgInput(prefillKg ? String(prefillKg) : "");
        const prefillReps = lastLogged?.reps ?? parseTopReps(nextEx.reps);
        setRepsInput(prefillReps ? String(prefillReps) : "");
      }
    });
  }

  function startTimer(onDone: () => void, restSeconds?: number | null) {
    if (!program) return;
    if (timerRef.current) clearInterval(timerRef.current);
    let t = restSeconds ?? program.restSeconds;
    setRestTime(t);
    setRestTotal(t);
    const nextEx = getCurrentExercise();
    scheduleRestTimerNotification(t, nextEx?.name ?? "próxima série");
    timerRef.current = setInterval(() => {
      t -= 1;
      setRestTime(t);
      if (t <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null;
        cancelRestTimerNotification();
        onDone();
      }
    }, 1000);
  }

  function handleSetDone() {
    const ex = getCurrentExercise();
    if (!ex || !currentWorkout) return;

    if (ex.holdSeconds) {
      setPhase("hold");
      setHoldTime(ex.holdSeconds);
      let t = ex.holdSeconds;
      if (holdTimerRef.current) clearInterval(holdTimerRef.current);
      holdTimerRef.current = setInterval(() => {
        t -= 1;
        setHoldTime(t);
        if (t <= 0) {
          if (holdTimerRef.current) clearInterval(holdTimerRef.current);
          const newLog = { ...sessionLog };
          if (!newLog[ex.exerciseId]) newLog[ex.exerciseId] = [];
          newLog[ex.exerciseId].push({ set: currentSet + 1, kg: 0, reps: null });
          setSessionLog(newLog);
          if (currentSet + 1 >= ex.sets) {
            const completed = new Set([...completedExercises, exerciseIndex]);
            setCompletedExercises(completed);
            const nextIdx = findNextExercise(exerciseIndex, completed);
            if (nextIdx === -1) {
              persistSession(newLog, currentWorkout);
              goScreen("done");
            } else {
              toPhase("rest");
              startTimer(() => goToStep(nextIdx, 0), ex.restSeconds);
            }
          } else {
            toPhase("rest");
            startTimer(() => goToStep(exerciseIndex, currentSet + 1), ex.restSeconds);
          }
        }
      }, 1000);
      return;
    }

    if (ex.unit === "corpo") {
      const newLog = { ...sessionLog };
      if (!newLog[ex.exerciseId]) newLog[ex.exerciseId] = [];
      newLog[ex.exerciseId].push({ set: currentSet + 1, kg: 0, reps: null });
      setSessionLog(newLog);
      if (currentSet + 1 >= ex.sets) {
        const completed = new Set([...completedExercises, exerciseIndex]);
        setCompletedExercises(completed);
        const nextIdx = findNextExercise(exerciseIndex, completed);
        if (nextIdx === -1) {
          persistSession(newLog, currentWorkout);
          goScreen("done");
          return;
        }
        toPhase("rest");
        startTimer(() => goToStep(nextIdx, 0), ex.restSeconds);
      } else {
        toPhase("rest");
        startTimer(() => goToStep(exerciseIndex, currentSet + 1), ex.restSeconds);
      }
      return;
    }
  }

  function handleKgSubmit() {
    const ex = getCurrentExercise();
    if (!ex || !currentWorkout) return;
    const kg = parseFloat(kgInput) || 0;
    const reps = parseInt(repsInput, 10);
    const newLog = { ...sessionLog };
    if (!newLog[ex.exerciseId]) newLog[ex.exerciseId] = [];
    newLog[ex.exerciseId].push({ set: currentSet + 1, kg, reps: Number.isFinite(reps) ? reps : null });
    setSessionLog(newLog);

    if (currentSet + 1 >= ex.sets) {
      const completed = new Set([...completedExercises, exerciseIndex]);
      setCompletedExercises(completed);
      const nextIdx = findNextExercise(exerciseIndex, completed);
      if (nextIdx === -1) {
        persistSession(newLog, currentWorkout);
        goScreen("done");
        return;
      }
      toPhase("rest");
      startTimer(() => goToStep(nextIdx, 0), ex.restSeconds);
    } else {
      toPhase("rest");
      startTimer(() => goToStep(exerciseIndex, currentSet + 1), ex.restSeconds);
    }
  }

  function jumpToExercise(idx: number) {
    if (completedExercises.has(idx)) return;
    if (timerRef.current) clearInterval(timerRef.current);
    cancelRestTimerNotification();
    goToStep(idx, 0);
  }

  function skipRest() {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    cancelRestTimerNotification();
    const ex = getCurrentExercise();
    if (!ex || !currentWorkout) return;
    if (currentSet + 1 >= ex.sets) {
      const nextIdx = findNextExercise(exerciseIndex);
      if (nextIdx === -1) {
        persistSession(sessionLog, currentWorkout);
        goScreen("done");
        return;
      }
      goToStep(nextIdx, 0);
    } else {
      goToStep(exerciseIndex, currentSet + 1);
    }
  }

  function requestExit() {
    setShowExitConfirm(true);
  }

  function confirmExit(completed: boolean) {
    setShowExitConfirm(false);
    if (timerRef.current) clearInterval(timerRef.current);
    if (holdTimerRef.current) clearInterval(holdTimerRef.current);
    cancelRestTimerNotification();
    if (completed && currentWorkout && Object.keys(sessionLog).length > 0) {
      persistSession(sessionLog, currentWorkout);
      goScreen("done");
    } else {
      goScreen("home");
    }
  }

  function getUpcomingExercises() {
    if (!currentWorkout) return [];
    return currentWorkout.exercises
      .map((ex, idx) => ({ ...ex, idx }))
      .filter((ex) => ex.idx !== exerciseIndex);
  }

  const screenAnim = `tabScreenIn .45s ${EASE} both`;
  const stagger = (i: number, base = 0) => `tabFadeUp .5s ${EASE} ${(base + i * 0.06).toFixed(2)}s both`;

  const shell = (children: React.ReactNode) => <div style={styles.container}>{children}</div>;

  if (loading) {
    return shell(<div style={styles.loadingWrap}>Carregando…</div>);
  }

  if (screen === "conflict" && conflictWorkout && program) {
    const todayStr = formatDate(new Date());
    const doneEntry = history.filter((e) => e.date === todayStr).slice(-1)[0];
    const doneWorkout = doneEntry ? program.workouts.find((w) => w.id === doneEntry.programWorkoutId) : null;
    return shell(
      <div key={screenTick} style={{ ...styles.scrim, position: "fixed", inset: 0 }}>
        <div style={styles.sheet}>
          <div style={styles.sheetIcon}>!</div>
          <h2 style={styles.sheetTitle}>Treino de hoje já feito</h2>
          <p style={styles.sheetBody}>
            {doneWorkout ? `Você já treinou ${doneWorkout.name} hoje.` : "Você já treinou hoje."} O próximo treino está marcado na tela inicial.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%", marginTop: 22 }}>
            <button className="tab-press" onClick={() => startWorkout(conflictWorkout)} style={styles.okBtn}>
              Treinar {conflictWorkout.name} mesmo assim
            </button>
            {doneEntry && (
              <button
                className="tab-press"
                onClick={() => {
                  setHistoryView(doneEntry);
                  setHistoryViewOrigin("home");
                  goScreen("history");
                }}
                style={styles.ghostBtn}
              >
                Ver treino feito hoje
              </button>
            )}
            <button
              className="tab-press"
              onClick={() => {
                setPreviewWorkout(conflictWorkout);
                goScreen("preview");
              }}
              style={styles.ghostBtn}
            >
              Ver {conflictWorkout.name}
            </button>
            <button onClick={() => goScreen("home")} style={{ ...styles.ghostBtn, border: "none", color: C.midGray }}>
              Cancelar
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (screen === "preview" && previewWorkout) {
    return shell(
      <div key={screenTick} style={{ animation: screenAnim }}>
        <div style={styles.topNav}>
          <button onClick={() => goScreen("home")} style={styles.backBtn}>← Início</button>
        </div>
        <div style={styles.histBody}>
          <h2 style={styles.detailTitle}>{`${previewWorkout.emoji}  ${previewWorkout.name}`}</h2>
          <p style={styles.detailSub}>{`${previewWorkout.exercises.length} exercícios`}</p>
          {previewWorkout.exercises.map((ex, i) => (
            <div key={ex.id} style={{ ...styles.histExCard, animation: stagger(i) }}>
              <div style={styles.histExName}>{ex.name}</div>
              <div style={{ fontSize: 11.5, color: C.midGray }}>
                {ex.holdSeconds ? `${ex.sets}×${ex.holdSeconds}s` : `${ex.sets}×${ex.reps}`}
                {ex.unit === "halter" ? " (cada halter)" : ""}
              </div>
            </div>
          ))}
          <button
            className="tab-press"
            onClick={() => startWorkout(previewWorkout)}
            style={{ ...styles.historyBtn, marginTop: 6, marginBottom: 24 }}
          >
            Treinar agora
          </button>
        </div>
      </div>
    );
  }

  if (screen === "home") {
    if (!program) {
      return shell(
        <div key={screenTick} style={{ animation: screenAnim }}>
          <div style={styles.accentBar} />
          <div style={styles.homeHeader}>
            {onGoHub && <button style={styles.hubHomeBtn} onClick={onGoHub}>← HUB</button>}
            <h1 style={styles.logoTitle}>TREINO</h1>
            <p style={styles.logoSub}>Nenhum programa ativo</p>
          </div>
          <div style={{ padding: "0 24px", textAlign: "center" }}>
            <p style={{ color: C.midGray, fontSize: 13, marginBottom: 20 }}>
              Crie um programa com seus treinos e exercícios para começar.
            </p>
            <button className="tab-press" onClick={() => onOpenProgramSettings?.()} style={styles.okBtn}>
              Criar programa
            </button>
          </div>
        </div>
      );
    }

    const week = getCurrentWeek(program, history);
    const { name: phaseName, desc, color } = getPhaseInfo(program, week);
    const nextIdx = getNextWorkoutIndex(program, history);
    const todayStr = formatDate(new Date());
    const restToday = isRestDay(program, history, todayStr);
    const todayEntries = history.filter((e) => e.date === todayStr);
    const trainedTodayAny = todayEntries.length > 0;
    const nextTag = trainedTodayAny || restToday ? "PRÓXIMO" : "HOJE";
    const isLastWeek = week >= program.weeks;

    return shell(
      <div key={screenTick} style={{ animation: screenAnim }}>
        <div style={styles.accentBar} />
        <div style={styles.homeHeader}>
          {onGoHub && <button style={styles.hubHomeBtn} onClick={onGoHub}>← HUB</button>}
          <h1 style={styles.logoTitle}>{program.name.toUpperCase()}</h1>
          <p style={styles.logoSub}>{program.weeks} Semanas</p>
        </div>
        {(!online || usingCache) && (
          <div style={{ ...styles.offlineBanner, margin: "0 26px 16px" }}>📡 Sem conexão — modo de visualização, treinos não serão salvos agora.</div>
        )}
        <div style={styles.weekCard}>
          <div style={styles.weekDotsRow}>
            {Array.from({ length: program.weeks }).map((_, i) => {
              const w = i + 1;
              const isCurrent = w === week;
              const isIdle = w > week;
              return (
                <div
                  key={w}
                  style={{
                    ...styles.weekDot,
                    ...(isIdle ? styles.weekDotIdle : { background: color }),
                    ...(isCurrent ? {} : null),
                    animation: stagger(i, 0.05),
                  }}
                >
                  <span style={{ ...styles.weekDotText, color: isIdle ? C.midGray : C.bgDark }}>{w}</span>
                </div>
              );
            })}
          </div>
          <div style={styles.weekInfo}>
            <span style={{ ...styles.weekPhase, color }}>{`Semana ${week} — ${phaseName}`}</span>
            {desc && <span style={styles.weekDesc}>{desc}</span>}
          </div>
        </div>
        {restToday && !trainedTodayAny && (
          <div style={{ margin: "0 24px 12px", background: C.bgCard, border: `1px solid ${C.bgHeader}`, borderRadius: 14, padding: "12px 16px", textAlign: "center" }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: C.lightGray }}>😌 Hoje é sugestão de descanso</div>
            <div style={{ fontSize: 11.5, color: C.midGray, marginTop: 4 }}>Quer treinar mesmo assim? É só tocar no próximo treino abaixo.</div>
          </div>
        )}
        {isLastWeek && scheduledProgram && (
          <div style={{ margin: "0 24px 12px", background: C.accentSoft, border: `1px solid ${C.accentEdge}`, borderRadius: 14, padding: "12px 16px", textAlign: "center" }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: C.green }}>✓ Próximo programa pronto</div>
            <div style={{ fontSize: 11.5, color: C.midGray, marginTop: 4 }}>
              {`"${scheduledProgram.name}" começa automaticamente quando este terminar.`}
            </div>
          </div>
        )}
        {isLastWeek && !scheduledProgram && (
          <div style={{ margin: "0 24px 12px", background: C.accentSoft, border: `1px solid ${C.accentEdge}`, borderRadius: 14, padding: "12px 16px", textAlign: "center" }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: C.accent }}>⚠️ Última semana deste programa</div>
            <div style={{ fontSize: 11.5, color: C.midGray, marginTop: 4, marginBottom: 12 }}>
              Cadastre o próximo programa agora — ele entra em sequência automaticamente quando este terminar, sem interromper nada.
            </div>
            <button
              className="tab-press"
              onClick={() => onOpenProgramSettings?.()}
              style={{ ...styles.okBtn, padding: "12px 20px", fontSize: 13 }}
            >
              Cadastrar próximo programa
            </button>
          </div>
        )}
        <div style={styles.homeCards}>
          {program.workouts.length === 0 && (
            <div style={{ ...styles.emptyState, padding: "20px 0" }}>
              Nenhum treino cadastrado ainda.
              <br />
              <span style={{ color: C.midGray }}>Adicione treinos e exercícios no gerenciador do programa.</span>
            </div>
          )}
          {program.workouts.map((workout, i) => {
            const isNext = i === nextIdx;
            const doneToday = todayEntries.filter((e) => e.programWorkoutId === workout.id).slice(-1)[0];
            const empty = workout.exercises.length === 0;
            return (
              <button
                key={workout.id}
                className="tab-press"
                disabled={empty}
                onClick={() => {
                  if (doneToday) {
                    setHistoryView(doneToday);
                    setHistoryViewOrigin("home");
                    goScreen("history");
                  } else if (todayEntries.length > 0) {
                    setConflictWorkout(workout);
                    goScreen("conflict");
                  } else {
                    startWorkout(workout);
                  }
                }}
                style={{
                  ...styles.workoutCard,
                  ...(isNext ? styles.workoutCardToday : null),
                  animation: stagger(i, 0.14),
                  opacity: empty ? 0.5 : 1,
                  cursor: empty ? "default" : "pointer",
                }}
              >
                {isNext && !doneToday && <span style={styles.sheen} />}
                <span style={{ ...styles.cardEmoji, ...(isNext ? styles.cardEmojiToday : null) }}>{workout.emoji}</span>
                <span style={styles.cardBody}>
                  <span style={styles.cardTitleRow}>
                    <span style={styles.cardTitle}>{workout.name}</span>
                    {doneToday ? (
                      <span style={styles.todayTag}>✓ FEITO</span>
                    ) : (
                      isNext && nextTag && <span style={styles.todayTag}>{nextTag}</span>
                    )}
                  </span>
                  <span style={styles.cardCount}>{empty ? "sem exercícios" : `${workout.exercises.length} exercícios`}</span>
                </span>
                <span style={styles.playIcon}>{doneToday ? "👁" : "▶"}</span>
              </button>
            );
          })}
        </div>
        <div style={{ margin: "12px 24px 12px" }}>
          <Heatmap trainedDates={getTrainedDateSet(history)} weekByDate={getTrainingWeekMap(program, history)} compact weeks={14} onClick={() => goScreen("stats")} />
        </div>
        <div style={styles.homeFooter}>
          <button className="tab-press" onClick={() => goScreen("history")} style={{ ...styles.historyBtn, flex: 1, margin: 0 }}>Progressão</button>
          <button className="tab-press" onClick={() => onOpenProgramSettings?.()} style={{ ...styles.historyBtn, flex: 1, margin: 0, border: "none", color: C.midGray }}>
            📋 Programas
          </button>
        </div>
      </div>
    );
  }

  if (screen === "done") {
    let sets = 0;
    let volume = 0;
    Object.values(sessionLog).forEach((arr) => arr.forEach((x) => { sets += 1; volume += x.kg || 0; }));
    const stats = [
      { value: Object.keys(sessionLog).length, label: "EXERCÍCIOS" },
      { value: sets, label: "SÉRIES" },
      { value: `${volume}kg`, label: "CARGA SOMADA" },
    ];
    const recentVolumes = currentWorkout
      ? history
          .filter((e) => e.programWorkoutId === currentWorkout.id)
          .slice(-5)
          .map((e) => Object.values(e.exercises).reduce((s, arr) => s + arr.reduce((s2, x) => s2 + (x.kg || 0), 0), 0))
      : [];
    const maxVol = Math.max(1, ...recentVolumes);
    return shell(
      <div key={screenTick} style={{ ...styles.doneWrap, animation: screenAnim }}>
        <div style={styles.doneBadgeWrap}>
          <div style={styles.doneGlow} />
          <div style={styles.doneCheck}>✓</div>
        </div>
        <h2 style={styles.doneTitle}>Treino Concluído</h2>
        <p style={styles.doneSub}>{currentWorkout ? `${currentWorkout.name} — ${sessionLabel}` : ""}</p>
        <div style={styles.doneStats}>
          {stats.map((s, i) => (
            <div key={s.label} style={{ ...styles.doneStat, animation: stagger(i, 0.2) }}>
              <span style={styles.doneStatValue}>{s.value}</span>
              <span style={styles.doneStatLabel}>{s.label}</span>
            </div>
          ))}
        </div>
        {recentVolumes.length > 1 && (
          <div style={styles.doneChart}>
            {recentVolumes.map((v, i) => (
              <div
                key={i}
                style={{
                  ...styles.doneBar,
                  ...(i === recentVolumes.length - 1 ? styles.doneBarLast : null),
                  height: `${Math.max(8, (v / maxVol) * 100)}%`,
                  animation: `tabBarGrow 600ms ${EASE} ${(i * 0.08).toFixed(2)}s both`,
                }}
              />
            ))}
          </div>
        )}
        <button className="tab-press" onClick={() => goScreen("home")} style={styles.doneBtn} disabled={saving}>
          {saving ? "Salvando…" : "Voltar ao Início"}
        </button>
      </div>
    );
  }

  if (screen === "stats" && program) {
    const trainedDates = getTrainedDateSet(history);
    const streak = getTrainingStreak(program, history);
    const todayD = new Date();

    const weekStart = new Date(todayD);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekTrained = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return d <= todayD && trainedDates.has(formatDate(d));
    }).filter(Boolean).length;

    const monthStart = new Date(todayD.getFullYear(), todayD.getMonth(), 1);
    const daysElapsedThisMonth = Math.floor((todayD.getTime() - monthStart.getTime()) / 86400000) + 1;
    let monthTrained = 0;
    const mCursor = new Date(monthStart);
    while (mCursor <= todayD) {
      if (trainedDates.has(formatDate(mCursor))) monthTrained += 1;
      mCursor.setDate(mCursor.getDate() + 1);
    }
    const expectedThisMonth = Math.max(1, Math.round(daysElapsedThisMonth * (6 / 7)));
    const adherencePct = Math.min(100, Math.round((monthTrained / expectedThisMonth) * 100));
    const monthName = MONTH_NAMES_FULL[todayD.getMonth()];

    return shell(
      <div key={screenTick} style={{ animation: screenAnim }}>
        <div style={styles.topNav}>
          <button onClick={() => goScreen("home")} style={styles.backBtn}>← Início</button>
        </div>
        <div style={styles.histBody}>
          <h2 style={styles.histTitle}>Consistência</h2>

          <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
            <div style={{ flex: 1, background: C.bgCard, border: `1px solid ${C.bgHeader}`, borderRadius: 16, padding: "16px 14px", textAlign: "center" }}>
              <div style={{ fontFamily: DISPLAY, fontSize: 24, fontWeight: 700, color: C.accent }}>{streak > 0 ? `🔥 ${streak}` : "0"}</div>
              <div style={{ fontSize: 9.5, color: C.midGray, letterSpacing: 0.8, fontWeight: 700, marginTop: 4 }}>SEQUÊNCIA (DIAS)</div>
            </div>
            <div style={{ flex: 1, background: C.bgCard, border: `1px solid ${C.bgHeader}`, borderRadius: 16, padding: "16px 14px", textAlign: "center" }}>
              <div style={{ fontFamily: DISPLAY, fontSize: 24, fontWeight: 700 }}>{weekTrained}<span style={{ fontSize: 14, color: C.midGray }}>/6</span></div>
              <div style={{ fontSize: 9.5, color: C.midGray, letterSpacing: 0.8, fontWeight: 700, marginTop: 4 }}>ESSA SEMANA</div>
            </div>
            <div style={{ flex: 1, background: C.bgCard, border: `1px solid ${C.bgHeader}`, borderRadius: 16, padding: "16px 14px", textAlign: "center" }}>
              <div style={{ fontFamily: DISPLAY, fontSize: 24, fontWeight: 700, color: adherencePct >= 80 ? C.green : C.accent }}>{adherencePct}%</div>
              <div style={{ fontSize: 9.5, color: C.midGray, letterSpacing: 0.8, fontWeight: 700, marginTop: 4 }}>{monthName.toUpperCase()}</div>
            </div>
          </div>

          <Heatmap trainedDates={trainedDates} weekByDate={getTrainingWeekMap(program, history)} />

          <div style={{ fontSize: 11.5, color: C.midGray, textAlign: "center", marginTop: 14, marginBottom: 24 }}>
            {monthTrained} dias treinados em {monthName} · meta ~{expectedThisMonth} (ritmo de 6 em cada 7 dias)
          </div>
        </div>
      </div>
    );
  }

  if (screen === "history") {
    if (historyView) {
      const entry = historyView;
      const workout = program?.workouts.find((w) => w.id === entry.programWorkoutId);
      const rows = workout
        ? workout.exercises.filter((ex) => (entry.exercises[ex.exerciseId] || []).length > 0)
        : Object.keys(entry.exercises).map((exId) => {
            const lib = library.find((l) => l.id === exId);
            return { exerciseId: exId, name: lib?.name ?? exId, id: exId, unit: lib?.unit ?? "total", sets: 0, reps: "", holdSeconds: null, orderIndex: 0 };
          });
      return shell(
        <div key={screenTick} style={{ animation: screenAnim }}>
          <div style={styles.topNav}>
            <button
              onClick={() => {
                if (historyViewOrigin === "home") {
                  setHistoryView(null);
                  goScreen("home");
                } else {
                  setHistoryView(null);
                }
              }}
              style={styles.backBtn}
            >
              ← Voltar
            </button>
          </div>
          <div style={styles.histBody}>
            <h2 style={styles.detailTitle}>
              {`${entry.workoutEmoji ?? workout?.emoji ?? ""} ${entry.programId && programSeq.has(entry.programId) ? `P${programSeq.get(entry.programId)} ` : ""}${entry.workoutLabel}`.trim()}
            </h2>
            <p style={styles.detailSub}>{`${formatDateDisplay(entry.date)}  •  ${entry.sessionLabel}`}</p>
            <div style={styles.detailStatsRow}>
              {(() => {
                let entrySets = 0;
                let entryVolume = 0;
                Object.values(entry.exercises).forEach((arr) => arr.forEach((s) => { entrySets += 1; entryVolume += s.kg || 0; }));
                const detailStats = [
                  { value: Object.keys(entry.exercises).length, label: "EXERCÍCIOS" },
                  { value: entrySets, label: "SÉRIES" },
                  { value: `${entryVolume}kg`, label: "CARGA", accent: true },
                ];
                return detailStats.map((s) => (
                  <div key={s.label} style={styles.detailStat}>
                    <span style={{ fontFamily: DISPLAY, fontSize: 19, fontWeight: 600, fontVariantNumeric: "tabular-nums", color: s.accent ? C.accent : C.white }}>{s.value}</span>
                    <span style={{ fontSize: 9, color: C.midGray, letterSpacing: 1 }}>{s.label}</span>
                  </div>
                ));
              })()}
            </div>
            {rows.map((ex, i) => {
              const currentMax = Math.max(...entry.exercises[ex.exerciseId].map((s) => s.kg || 0));
              const priorEntry = history
                .filter((e) => e.date < entry.date && (e.exercises[ex.exerciseId]?.length ?? 0) > 0)
                .slice(-1)[0];
              const priorMax = priorEntry ? Math.max(...priorEntry.exercises[ex.exerciseId].map((s) => s.kg || 0)) : null;
              const delta = priorMax != null ? currentMax - priorMax : null;
              return (
              <div key={ex.exerciseId} style={{ ...styles.histExCard, animation: stagger(i) }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <div style={styles.histExName}>{ex.name}</div>
                  {delta != null && (
                    <span style={{ ...styles.histExDelta, color: delta > 0 ? C.accent : delta < 0 ? C.red : C.midGray }}>
                      {delta === 0 ? "manteve" : `${delta > 0 ? "+" : ""}${delta}kg`}
                    </span>
                  )}
                </div>
                <div style={styles.histSetsRow}>
                  {entry.exercises[ex.exerciseId].map((s, j) => (
                    <div key={j} style={styles.histSetBadge}>
                      <span style={styles.histSetLabel}>{`S${s.set}`}</span>
                      <span style={styles.histSetKg}>{s.reps ? `${s.kg}kg×${s.reps}` : `${s.kg}kg`}</span>
                    </div>
                  ))}
                </div>
              </div>
              );
            })}
            {workout && (
              <button
                className="tab-press"
                onClick={() => {
                  setHistoryView(null);
                  startWorkout(workout);
                }}
                style={{ ...styles.historyBtn, marginTop: 6, marginBottom: 24 }}
              >
                Treinar novamente
              </button>
            )}
          </div>
        </div>
      );
    }

    const grouped: Record<string, HistoryEntry[]> = {};
    history.forEach((e) => {
      const key = e.programWorkoutId ?? e.workoutLabel;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(e);
    });

    const exercisesWithData = library.filter((ex) =>
      history.some((e) => (e.exercises[ex.id]?.length ?? 0) > 0)
    );
    const activeId = selectedExerciseId && exercisesWithData.some((ex) => ex.id === selectedExerciseId)
      ? selectedExerciseId
      : exercisesWithData[0]?.id ?? null;
    const activeEx = exercisesWithData.find((ex) => ex.id === activeId) ?? null;

    const weeklyBuckets = (metric: "volume" | "frequencia") => {
      const today = new Date();
      const buckets = new Array(8).fill(0);
      history.forEach((e) => {
        const [y, m, d] = e.date.split("-").map(Number);
        const entryDate = new Date(y, m - 1, d);
        const daysAgo = Math.floor((today.getTime() - entryDate.getTime()) / 86400000);
        const weekIdx = 7 - Math.floor(daysAgo / 7);
        if (weekIdx < 0 || weekIdx > 7) return;
        if (metric === "frequencia") {
          buckets[weekIdx] += 1;
        } else {
          Object.values(e.exercises).forEach((sets) => sets.forEach((s) => { buckets[weekIdx] += s.kg || 0; }));
        }
      });
      return buckets;
    };

    return shell(
      <div key={screenTick} style={{ animation: screenAnim }}>
        <div style={styles.topNav}>
          <button onClick={() => goScreen("home")} style={styles.backBtn}>← Início</button>
        </div>
        <div style={styles.histBody}>
          <h2 style={styles.histTitle}>Progressão de Carga</h2>
          {history.length === 0 && (
            <div style={styles.emptyState}>
              Nenhum treino registrado ainda.
              <br />
              <span style={{ color: C.midGray }}>Finalize um treino para ver a evolução das cargas.</span>
            </div>
          )}
          {history.length > 0 && (
            <>
              {chartMetric === "carga" && activeEx && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 12, marginBottom: 4 }}>
                    {exercisesWithData.map((ex) => {
                      const isActive = ex.id === activeId;
                      return (
                        <button
                          key={ex.id}
                          onClick={() => setSelectedExerciseId(ex.id)}
                          style={{
                            flexShrink: 0,
                            padding: "8px 14px",
                            borderRadius: 10,
                            fontSize: 12,
                            fontWeight: 600,
                            whiteSpace: "nowrap",
                            cursor: "pointer",
                            border: `1px solid ${isActive ? C.accent : C.bgHeader}`,
                            background: isActive ? C.accentSoft : "transparent",
                            color: isActive ? C.accent : C.lightGray,
                          }}
                        >
                          {ex.name}
                        </button>
                      );
                    })}
                  </div>
                  <ProgressChart points={getExerciseSeries(history, activeEx.id)} exerciseName={activeEx.name} unit={activeEx.unit} />
                </div>
              )}
              {(chartMetric === "volume" || chartMetric === "frequencia") && (
                <div style={{ ...styles.chartCard, margin: "0 0 12px" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>
                    {chartMetric === "volume" ? "Volume semanal" : "Frequência semanal"}
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 84 }}>
                    {(() => {
                      const buckets = weeklyBuckets(chartMetric);
                      const max = Math.max(1, ...buckets);
                      return buckets.map((v, i) => (
                        <div
                          key={i}
                          style={{
                            flex: 1,
                            height: `${Math.max(4, (v / max) * 100)}%`,
                            borderRadius: 4,
                            transformOrigin: "bottom",
                            background: i === buckets.length - 1 ? G.limeBar : "rgba(13,27,42,.1)",
                            boxShadow: "none",
                            animation: `tabBarGrow 500ms ${EASE} ${(i * 0.05).toFixed(2)}s both`,
                          }}
                        />
                      ));
                    })()}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9.5, color: C.faint, marginTop: 6 }}>
                    <span>8 sem. atrás</span>
                    <span>hoje</span>
                  </div>
                </div>
              )}
              <div style={{ display: "flex", gap: 8, marginBottom: 30 }}>
                {(["carga", "volume", "frequencia"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setChartMetric(m)}
                    style={{ ...styles.filterChip, ...(chartMetric === m ? styles.filterChipActive : null), flex: 1, textAlign: "center" }}
                  >
                    {m === "carga" ? "Carga" : m === "volume" ? "Volume" : "Frequência"}
                  </button>
                ))}
              </div>
            </>
          )}
          {(() => {
            const groupLabels: Record<string, string> = {};
            Object.entries(grouped).forEach(([key, entries]) => {
              const first = entries[0];
              const workout = program?.workouts.find((w) => w.id === first.programWorkoutId);
              const seqPrefix = first.programId && programSeq.has(first.programId) ? `P${programSeq.get(first.programId)} ` : "";
              groupLabels[key] = `${first.workoutEmoji ?? workout?.emoji ?? ""} ${seqPrefix}${first.workoutLabel}`.trim();
            });
            const groupKeys = Object.keys(grouped);
            if (groupKeys.length < 2) return null;
            return (
              <div style={{ ...styles.filterRow, overflowX: "auto" }}>
                <button onClick={() => setHistoryFilter(null)} style={{ ...styles.filterChip, ...(historyFilter === null ? styles.filterChipActive : null), flexShrink: 0 }}>
                  Tudo
                </button>
                {groupKeys.map((key) => (
                  <button
                    key={key}
                    onClick={() => setHistoryFilter(key === historyFilter ? null : key)}
                    style={{ ...styles.filterChip, ...(historyFilter === key ? styles.filterChipActive : null), whiteSpace: "nowrap", flexShrink: 0 }}
                  >
                    {groupLabels[key]}
                  </button>
                ))}
              </div>
            );
          })()}
          {Object.entries(grouped)
            .filter(([key]) => historyFilter === null || key === historyFilter)
            .map(([key, entries]) => {
            if (!entries || entries.length === 0) return null;
            const first = entries[0];
            const workout = program?.workouts.find((w) => w.id === first.programWorkoutId);
            const seqPrefix = first.programId && programSeq.has(first.programId) ? `P${programSeq.get(first.programId)} ` : "";
            const label = `${first.workoutEmoji ?? workout?.emoji ?? ""} ${seqPrefix}${first.workoutLabel}`.trim();
            return (
              <div key={key} style={{ marginBottom: 34 }}>
                <div style={styles.groupHeader}>
                  <span style={styles.groupName}>{label}</span>
                  <span style={styles.groupRule} />
                  <span style={styles.groupCount}>{`${entries.length} ${entries.length === 1 ? "SESSÃO" : "SESSÕES"}`}</span>
                </div>
                {entries.slice().reverse().map((e, i) => (
                  <button
                    key={e.id ?? i}
                    onClick={() => {
                      setHistoryView(e);
                      setHistoryViewOrigin("history");
                    }}
                    style={styles.histEntry}
                  >
                    <span style={{ ...styles.histEntryBadge, ...(e.sessionLabel.charAt(0) === "A" ? styles.histEntryBadgeA : null) }}>
                      {e.sessionLabel.charAt(0)}
                    </span>
                    <span style={styles.histEntryLeft}>
                      <span style={styles.histEntryDate}>{formatDateDisplay(e.date)}</span>
                      <span style={styles.histEntryWeek}>{e.sessionLabel}</span>
                    </span>
                    <span style={styles.histEntryCount}>{`${Object.keys(e.exercises).length} ex. →`}</span>
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (!program || !currentWorkout) return shell(<div style={styles.loadingWrap}>—</div>);

  const workout = currentWorkout;
  const exercise = getCurrentExercise();
  if (!exercise) return shell(<div style={styles.loadingWrap}>—</div>);
  const upcoming = getUpcomingExercises();
  const lastKg = lastWeights[exercise.exerciseId];
  const week = getCurrentWeek(program, history);
  const badgeColor = getPhaseInfo(program, week).color;
  const doneSets = sessionLog[exercise.exerciseId] || [];
  const phaseAnim = phaseExiting ? "tabPhaseOut .17s ease forwards" : `tabPhaseIn .38s ${EASE} both`;
  const exerciseGifUrl = library.find((l) => l.id === exercise.exerciseId)?.gifUrl ?? null;
  const totalSets = workout.exercises.reduce((s, e) => s + e.sets, 0);
  const doneSetsCount = workout.exercises.reduce((sum, ex, idx) => {
    if (completedExercises.has(idx)) return sum + ex.sets;
    if (idx === exerciseIndex) return sum + doneSets.length;
    return sum;
  }, 0);
  const workoutProgressPct = totalSets > 0 ? Math.round((doneSetsCount / totalSets) * 100) : 0;

  return shell(
    <div key={screenTick} style={{ animation: screenAnim }}>
      <div style={styles.workoutNav}>
        <span style={styles.workoutNavLeft}>
          <span style={styles.workoutNavTitle}>{`${workout.emoji}  ${workout.name}`}</span>
          <span style={{ ...styles.weekBadge, background: badgeColor }}>{sessionLabel}</span>
        </span>
        <button onClick={requestExit} style={styles.exitBtn}>Encerrar</button>
      </div>
      <div style={styles.progressTrack}>
        <div style={{ ...styles.progressFill, width: `${workoutProgressPct}%` }} />
      </div>
      <div style={styles.currentCard}>
        <div key={exerciseIndex} style={{ animation: `tabExIn .42s ${EASE} both` }}>
          {exerciseGifUrl && (phase === "active" || phase === "input") && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={exerciseGifUrl}
              alt={exercise.name}
              onClick={() => setGifModalUrl(exerciseGifUrl)}
              style={{ width: "auto", maxWidth: "100%", height: 72, objectFit: "contain", borderRadius: 12, marginBottom: 6, cursor: "pointer" }}
            />
          )}
          <div style={styles.currentLabel}>EXERCÍCIO ATUAL</div>
          <h2 style={styles.currentName}>{exercise.name}</h2>
          <div style={styles.currentReps}>{exercise.holdSeconds ? exercise.reps + " por série" : exercise.reps + " reps"}</div>
          {lastKg > 0 && phase === "active" && (
            <div style={styles.lastKgHint}>{`Última carga: ${lastKg}kg${exercise.unit === "halter" ? " cada" : ""}`}</div>
          )}
          {exercise.notes && (
            <div style={{ marginTop: 6, padding: "6px 10px", background: "rgba(255,95,82,.1)", border: "1px solid rgba(255,95,82,.35)", borderRadius: 10, fontSize: 10.5, color: C.lightGray, textAlign: "left", lineHeight: 1.3 }}>
              {exercise.notes}
            </div>
          )}
        </div>
        <div style={styles.setsRow}>
          {Array.from({ length: exercise.sets }).map((_, i) => {
            const isDone = doneSets.some((s) => s.set === i + 1);
            const isCurrent = i === currentSet && !isDone;
            return (
              <div key={i} style={{ ...styles.setDot, ...(isDone ? styles.setDotDone : isCurrent ? styles.setDotCurrent : null) }}>
                <span style={{ ...styles.setDotText, color: isDone ? C.cream : isCurrent ? C.accent : C.faint }}>{`${i + 1}ª`}</span>
              </div>
            );
          })}
        </div>
        <div key={phaseTick + (phaseExiting ? "-out" : "-in")} style={{ animation: phaseAnim }}>
          {phase === "active" && (
            <button className="tab-press" onClick={handleSetDone} style={styles.okBtn}>
              {exercise.holdSeconds ? "INICIAR ▶" : "SÉRIE FEITA ✓"}
            </button>
          )}
          {phase === "hold" && (
            <div style={styles.restWrap}>
              <div style={{ ...styles.restLabel, color: C.accent }}>SEGURA!</div>
              <div style={styles.ringWrap}>
                <div style={styles.ringGlow} />
                <svg width="216" height="216" viewBox="0 0 100 100" style={{ transform: "rotate(-90deg)" }}>
                  <circle cx="50" cy="50" r={RING_R} fill="none" stroke="rgba(13,27,42,.08)" strokeWidth="4" />
                  <circle cx="50" cy="50" r={RING_R} fill="none" stroke={C.accent} strokeWidth="4" strokeLinecap="round" strokeDasharray={RING_CIRC} strokeDashoffset={RING_CIRC * (1 - holdTime / (exercise.holdSeconds || 40))} style={{ transition: "stroke-dashoffset 1s linear" }} />
                </svg>
                <div style={styles.ringCenter}>
                  <span style={styles.restTimer}>{holdTime}</span>
                  <span style={styles.restUnit}>SEG</span>
                </div>
              </div>
              <div style={{ ...styles.nextUp, color: C.accent }}>{`${currentSet + 1}ª de ${exercise.sets} séries`}</div>
            </div>
          )}
          {phase === "input" && (
            <div>
              <label style={styles.inputLabel}>{exercise.unit === "halter" ? "KG por halter" : "KG total"}</label>
              <div style={styles.inputRow}>
                <input type="number" inputMode="decimal" value={kgInput} onChange={(e) => setKgInput(e.target.value)} onFocus={(e) => e.target.select()} style={{ ...styles.kgInput, width: 110 }} placeholder="0" />
                <span style={styles.kgUnit}>kg</span>
                <span style={{ fontSize: 16, color: C.faint, margin: "0 2px" }}>×</span>
                <input type="number" inputMode="numeric" value={repsInput} onChange={(e) => setRepsInput(e.target.value)} onFocus={(e) => e.target.select()} style={{ ...styles.kgInput, width: 64, fontSize: 28, color: C.accent }} placeholder="0" />
                <span style={styles.kgUnit}>reps</span>
              </div>
              <div style={{ height: 1, background: "rgba(13,27,42,.08)", margin: "0 0 10px" }} />
              <div style={styles.kgAdjRow}>
                <button className="tab-press" onClick={() => setKgInput(String(Math.max(0, (parseFloat(kgInput) || 0) - 2.5)))} style={styles.kgAdjBtn}>− 2,5</button>
                <button className="tab-press" onClick={() => setKgInput(String((parseFloat(kgInput) || 0) + 2.5))} style={styles.kgAdjBtn}>+ 2,5</button>
              </div>
              <div style={styles.unitHint}>{exercise.unit === "halter" ? "cada halter" : "peso total na máquina/barra"}</div>
              <button className="tab-press" onClick={handleKgSubmit} style={styles.confirmBtn}>CONFIRMAR</button>
            </div>
          )}
          {phase === "rest" && (
            <div style={styles.restWrap}>
              <div style={styles.restLabel}>DESCANSO</div>
              <div style={styles.ringWrap}>
                <div style={styles.ringGlow} />
                <svg width="216" height="216" viewBox="0 0 100 100" style={{ transform: "rotate(-90deg)" }}>
                  <circle cx="50" cy="50" r={RING_R} fill="none" stroke="rgba(13,27,42,.08)" strokeWidth="4" />
                  <circle cx="50" cy="50" r={RING_R} fill="none" stroke={C.accent} strokeWidth="4" strokeLinecap="round" strokeDasharray={RING_CIRC} strokeDashoffset={RING_CIRC * (1 - restTime / (restTotal || program.restSeconds))} style={{ transition: "stroke-dashoffset 1s linear" }} />
                </svg>
                <div style={styles.ringCenter}>
                  <span style={styles.restTimer}>{restTime}</span>
                  <span style={styles.restUnit}>SEG</span>
                </div>
              </div>
              <div style={styles.nextUp}>{upcoming.length > 0 ? `A seguir: ${upcoming[0].name}` : "Última série"}</div>
              <button className="tab-press" onClick={skipRest} style={styles.skipBtn}>PULAR →</button>
            </div>
          )}
        </div>
      </div>
      <div style={styles.upcomingSection}>
        <div style={styles.upcomingHeader}>
          <span style={styles.upcomingLabel}>PRÓXIMOS</span>
          <span style={styles.upcomingCount}>{`${workout.exercises.length - completedExercises.size} RESTANTES`}</span>
        </div>
        <div style={{ ...styles.upcomingList, maxHeight: 206 }}>
          {upcoming.map((ex) => {
            const isDone = completedExercises.has(ex.idx);
            const lw = lastWeights[ex.exerciseId];
            return (
              <div key={ex.idx} style={{ ...styles.upcomingItem, padding: "9px 12px", opacity: isDone ? 0.32 : 1 }}>
                <span style={styles.upcomingNum}>{String(ex.idx + 1).padStart(2, "0")}</span>
                <span style={styles.upcomingInfo}>
                  <span style={{ ...styles.upcomingName, textDecoration: isDone ? "line-through" : "none" }}>{ex.name}</span>
                  <span style={styles.upcomingMeta}>{`${ex.sets}×${ex.reps}${lw > 0 ? `  •  ${lw}kg` : ""}`}</span>
                </span>
                {!isDone && (
                  <button className="tab-press" onClick={() => jumpToExercise(ex.idx)} style={styles.upcomingPlay}>▶</button>
                )}
              </div>
            );
          })}
        </div>
      </div>
      {showExitConfirm && (
        <div
          onClick={() => setShowExitConfirm(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.75)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 24,
            animation: "tabFadeUp .2s ease both",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: C.bgCard, border: `1px solid ${C.bgHeader}`, borderRadius: 18, padding: 22, width: "100%", maxWidth: 340, textAlign: "center" }}
          >
            <div style={{ fontFamily: DISPLAY, fontSize: 17, fontWeight: 700, marginBottom: 8 }}>Você concluiu o treino?</div>
            <div style={{ fontSize: 12.5, color: C.midGray, marginBottom: 20 }}>Isso decide se essa sessão conta como um treino feito.</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button className="tab-press" onClick={() => confirmExit(true)} style={styles.okBtn}>Sim, concluí</button>
              <button className="tab-press" onClick={() => confirmExit(false)} style={{ ...styles.historyBtn, margin: 0 }}>Não, só sair</button>
            </div>
          </div>
        </div>
      )}
      {gifModalUrl && (
        <div
          onClick={() => setGifModalUrl(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 24,
            animation: "tabFadeUp .25s ease both",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={gifModalUrl}
            alt={exercise.name}
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "100%", maxHeight: "100%", borderRadius: 16, objectFit: "contain" }}
          />
        </div>
      )}
    </div>
  );
}
