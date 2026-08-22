"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getHistory, getLastWeights, saveSession as saveSessionRemote, upsertLastWeights } from "@/lib/data";
import {
  WORKOUTS,
  REST_SECONDS,
  getCurrentWeek,
  getPhaseInfo,
  getTodayWorkout,
  formatDate,
  formatDateDisplay,
  getSessionId,
  type WorkoutKey,
  type SessionLog,
  type HistoryEntry,
  type Exercise,
} from "@/lib/workouts";
import { C, DISPLAY, EASE, styles } from "@/lib/styles";
import { signOut } from "./actions";

const RING_R = 74;
const RING_CIRC = 2 * Math.PI * RING_R;
const PHASE_OUT_MS = 170;

type Screen = "home" | "workout" | "done" | "history";
type Phase = "active" | "rest" | "input" | "hold";

function initialPhaseFor(ex: Exercise): Phase {
  if (ex.holdSeconds) return "active";
  if (ex.unit === "corpo") return "active";
  return "input";
}

export default function WorkoutApp() {
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [screen, setScreen] = useState<Screen>("home");
  const [workoutKey, setWorkoutKey] = useState<WorkoutKey | null>(null);
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [currentSet, setCurrentSet] = useState(0);
  const [phase, setPhase] = useState<Phase>("active");
  const [phaseExiting, setPhaseExiting] = useState(false);
  const [phaseTick, setPhaseTick] = useState(0);
  const [screenTick, setScreenTick] = useState(0);
  const [restTime, setRestTime] = useState(0);
  const [kgInput, setKgInput] = useState("");
  const [sessionLog, setSessionLog] = useState<SessionLog>({});
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyView, setHistoryView] = useState<HistoryEntry | null>(null);
  const [completedExercises, setCompletedExercises] = useState<Set<number>>(new Set());
  const [lastWeights, setLastWeights] = useState<Record<string, number>>({});
  const [sessionId, setSessionId] = useState("");
  const [holdTime, setHoldTime] = useState(0);
  const [saving, setSaving] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const phaseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [h, w] = await Promise.all([getHistory(supabase), getLastWeights(supabase)]);
        if (!cancelled) {
          setHistory(h);
          setLastWeights(w);
        }
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

  async function persistSession(log: SessionLog, wKey: WorkoutKey) {
    const entry: HistoryEntry = {
      date: formatDate(new Date()),
      workout: wKey,
      week: getCurrentWeek(),
      sessionId,
      exercises: log,
    };
    setSaving(true);
    try {
      await saveSessionRemote(supabase, entry);
      const newLastWeights = { ...lastWeights };
      Object.entries(log).forEach(([exId, sets]) => {
        if (sets && sets.length > 0) newLastWeights[exId] = Math.max(...sets.map((s) => s.kg || 0));
      });
      await upsertLastWeights(supabase, newLastWeights);
      setHistory((prev) => [...prev, entry]);
      setLastWeights(newLastWeights);
    } finally {
      setSaving(false);
    }
  }

  function goScreen(next: Screen) {
    setScreenTick((t) => t + 1);
    setScreen(next);
  }

  function toPhase(next: Phase, after?: () => void) {
    setPhaseExiting(true);
    if (phaseTimeoutRef.current) clearTimeout(phaseTimeoutRef.current);
    phaseTimeoutRef.current = setTimeout(() => {
      if (after) after();
      setPhase(next);
      setPhaseExiting(false);
      setPhaseTick((t) => t + 1);
    }, PHASE_OUT_MS);
  }

  function startWorkout(key: WorkoutKey) {
    const firstEx = WORKOUTS[key].exercises[0];
    const firstPhase = initialPhaseFor(firstEx);
    setWorkoutKey(key);
    setExerciseIndex(0);
    setCurrentSet(0);
    setPhase(firstPhase);
    setKgInput(firstPhase === "input" && lastWeights[firstEx.id] ? String(lastWeights[firstEx.id]) : "");
    setPhaseExiting(false);
    setSessionLog({});
    setCompletedExercises(new Set());
    setSessionId(getSessionId(key, history));
    goScreen("workout");
  }

  function getCurrentExercise(): Exercise | null {
    if (!workoutKey) return null;
    return WORKOUTS[workoutKey].exercises[exerciseIndex];
  }

  function findNextExercise(fromIdx: number, completed: Set<number> = completedExercises): number {
    if (!workoutKey) return -1;
    const exercises = WORKOUTS[workoutKey].exercises;
    for (let i = fromIdx + 1; i < exercises.length; i++) if (!completed.has(i)) return i;
    for (let i = 0; i <= fromIdx; i++) if (!completed.has(i)) return i;
    return -1;
  }

  function goToStep(nextIdx: number, nextSet: number) {
    if (!workoutKey) return;
    const nextEx = WORKOUTS[workoutKey].exercises[nextIdx];
    const nextPhase = initialPhaseFor(nextEx);
    toPhase(nextPhase, () => {
      setExerciseIndex(nextIdx);
      setCurrentSet(nextSet);
      if (nextPhase === "input") {
        setKgInput(lastWeights[nextEx.id] ? String(lastWeights[nextEx.id]) : "");
      }
    });
  }

  function startTimer(onDone: () => void) {
    if (timerRef.current) clearInterval(timerRef.current);
    let t = REST_SECONDS;
    setRestTime(t);
    timerRef.current = setInterval(() => {
      t -= 1;
      setRestTime(t);
      if (t <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null;
        onDone();
      }
    }, 1000);
  }

  function handleSetDone() {
    const ex = getCurrentExercise();
    if (!ex || !workoutKey) return;

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
          if (!newLog[ex.id]) newLog[ex.id] = [];
          newLog[ex.id].push({ set: currentSet + 1, kg: 0 });
          setSessionLog(newLog);
          if (currentSet + 1 >= ex.sets) {
            const nextIdx = findNextExercise(exerciseIndex, new Set([...completedExercises, exerciseIndex]));
            if (nextIdx === -1) {
              persistSession(newLog, workoutKey);
              goScreen("done");
            } else {
              toPhase("rest");
              startTimer(() => goToStep(nextIdx, 0));
            }
          } else {
            toPhase("rest");
            startTimer(() => goToStep(exerciseIndex, currentSet + 1));
          }
        }
      }, 1000);
      return;
    }

    if (ex.unit === "corpo") {
      const newLog = { ...sessionLog };
      if (!newLog[ex.id]) newLog[ex.id] = [];
      newLog[ex.id].push({ set: currentSet + 1, kg: 0 });
      setSessionLog(newLog);
      if (currentSet + 1 >= ex.sets) {
        const completed = new Set([...completedExercises, exerciseIndex]);
        setCompletedExercises(completed);
        const nextIdx = findNextExercise(exerciseIndex, completed);
        if (nextIdx === -1) {
          persistSession(newLog, workoutKey);
          goScreen("done");
          return;
        }
        toPhase("rest");
        startTimer(() => goToStep(nextIdx, 0));
      } else {
        toPhase("rest");
        startTimer(() => goToStep(exerciseIndex, currentSet + 1));
      }
      return;
    }
  }

  function handleKgSubmit() {
    const ex = getCurrentExercise();
    if (!ex || !workoutKey) return;
    const kg = parseFloat(kgInput) || 0;
    const newLog = { ...sessionLog };
    if (!newLog[ex.id]) newLog[ex.id] = [];
    newLog[ex.id].push({ set: currentSet + 1, kg });
    setSessionLog(newLog);

    if (currentSet + 1 >= ex.sets) {
      const completed = new Set([...completedExercises, exerciseIndex]);
      setCompletedExercises(completed);
      const nextIdx = findNextExercise(exerciseIndex, completed);
      if (nextIdx === -1) {
        persistSession(newLog, workoutKey);
        goScreen("done");
        return;
      }
      toPhase("rest");
      startTimer(() => goToStep(nextIdx, 0));
    } else {
      toPhase("rest");
      startTimer(() => goToStep(exerciseIndex, currentSet + 1));
    }
  }

  function jumpToExercise(idx: number) {
    if (completedExercises.has(idx)) return;
    if (timerRef.current) clearInterval(timerRef.current);
    goToStep(idx, 0);
  }

  function skipRest() {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    const ex = getCurrentExercise();
    if (!ex || !workoutKey) return;
    if (currentSet + 1 >= ex.sets) {
      const nextIdx = findNextExercise(exerciseIndex);
      if (nextIdx === -1) {
        persistSession(sessionLog, workoutKey);
        goScreen("done");
        return;
      }
      goToStep(nextIdx, 0);
    } else {
      goToStep(exerciseIndex, currentSet + 1);
    }
  }

  function finishEarly() {
    if (timerRef.current) clearInterval(timerRef.current);
    if (holdTimerRef.current) clearInterval(holdTimerRef.current);
    if (workoutKey && Object.keys(sessionLog).length > 0) persistSession(sessionLog, workoutKey);
    goScreen("done");
  }

  function getUpcomingExercises() {
    if (!workoutKey) return [];
    return WORKOUTS[workoutKey].exercises
      .map((ex, idx) => ({ ...ex, idx }))
      .filter((ex) => ex.idx !== exerciseIndex);
  }

  const screenAnim = `tabScreenIn .45s ${EASE} both`;
  const stagger = (i: number, base = 0) => `tabFadeUp .5s ${EASE} ${(base + i * 0.06).toFixed(2)}s both`;

  const shell = (children: React.ReactNode) => (
    <div style={styles.page}>
      <div style={styles.container}>{children}</div>
    </div>
  );

  if (loading) {
    return shell(<div style={styles.loadingWrap}>Carregando…</div>);
  }

  if (screen === "home") {
    const week = getCurrentWeek();
    const { phase: phaseName, desc, color } = getPhaseInfo(week);
    return shell(
      <div key={screenTick} style={{ animation: screenAnim }}>
        <div style={styles.accentBar} />
        <div style={styles.homeHeader}>
          <form action={signOut}>
            <button type="submit" style={styles.signOutBtn}>Sair</button>
          </form>
          <h1 style={styles.logoTitle}>TREINO A/B</h1>
          <p style={styles.logoSub}>4 Semanas — Plano de Adaptação</p>
        </div>
        <div style={styles.weekCard}>
          <div style={styles.weekDotsRow}>
            {[1, 2, 3, 4].map((w, i) => (
              <div key={w} style={{ ...styles.weekDot, background: w <= week ? color : C.bgHeader, animation: stagger(i, 0.05) }}>
                <span style={{ ...styles.weekDotText, color: w <= week ? C.bgDark : C.midGray }}>{w}</span>
              </div>
            ))}
          </div>
          <div style={styles.weekInfo}>
            <span style={{ ...styles.weekPhase, color }}>{`Semana ${week} — ${phaseName}`}</span>
            <span style={styles.weekDesc}>{desc}</span>
          </div>
        </div>
        <div style={styles.homeCards}>
          {(["A", "B"] as WorkoutKey[]).map((k, i) => {
            const isToday = getTodayWorkout() === k;
            return (
              <button key={k} className="tab-press" onClick={() => startWorkout(k)} style={{ ...styles.workoutCard, borderColor: isToday ? C.accent : C.bgHeader, animation: stagger(i, 0.14) }}>
                <span style={styles.cardEmoji}>{WORKOUTS[k].emoji}</span>
                <span style={styles.cardBody}>
                  <span style={styles.cardTitleRow}>
                    <span style={styles.cardTitle}>{WORKOUTS[k].name}</span>
                    {isToday && <span style={styles.todayTag}>HOJE</span>}
                  </span>
                  <span style={styles.cardSub}>{WORKOUTS[k].subtitle}</span>
                  <span style={styles.cardCount}>{`${WORKOUTS[k].exercises.length} exercícios`}</span>
                </span>
                <span style={styles.playIcon}>▶</span>
              </button>
            );
          })}
        </div>
        <button className="tab-press" onClick={() => goScreen("history")} style={styles.historyBtn}>Progressão de Carga</button>
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
    return shell(
      <div key={screenTick} style={{ ...styles.doneWrap, animation: screenAnim }}>
        <div style={styles.doneBadgeWrap}>
          <div style={styles.doneGlow} />
          <div style={styles.doneCheck}>✓</div>
        </div>
        <h2 style={styles.doneTitle}>Treino Concluído</h2>
        <p style={styles.doneSub}>{workoutKey ? `${WORKOUTS[workoutKey].name} — ${sessionId}` : ""}</p>
        <div style={styles.doneStats}>
          {stats.map((s, i) => (
            <div key={s.label} style={{ ...styles.doneStat, animation: stagger(i, 0.2) }}>
              <span style={styles.doneStatValue}>{s.value}</span>
              <span style={styles.doneStatLabel}>{s.label}</span>
            </div>
          ))}
        </div>
        <button className="tab-press" onClick={() => goScreen("home")} style={styles.doneBtn} disabled={saving}>
          {saving ? "Salvando…" : "Voltar ao Início"}
        </button>
      </div>
    );
  }

  if (screen === "history") {
    if (historyView) {
      const entry = historyView;
      const workout = WORKOUTS[entry.workout];
      const rows = workout.exercises.filter((ex) => (entry.exercises[ex.id] || []).length > 0);
      return shell(
        <div key={screenTick} style={{ animation: screenAnim }}>
          <div style={styles.topNav}>
            <button onClick={() => setHistoryView(null)} style={styles.backBtn}>← Voltar</button>
          </div>
          <div style={styles.histBody}>
            <h2 style={styles.detailTitle}>{`${workout.emoji}  ${workout.name}`}</h2>
            <p style={styles.detailSub}>{`${formatDateDisplay(entry.date)}${entry.sessionId ? `  •  ${entry.sessionId}` : `  •  Semana ${entry.week}`}`}</p>
            {rows.map((ex, i) => (
              <div key={ex.id} style={{ ...styles.histExCard, animation: stagger(i) }}>
                <div style={styles.histExName}>{ex.name}</div>
                <div style={styles.histSetsRow}>
                  {entry.exercises[ex.id].map((s, j) => (
                    <div key={j} style={styles.histSetBadge}>
                      <span style={styles.histSetLabel}>{`S${s.set}`}</span>
                      <span style={styles.histSetKg}>{`${s.kg}kg`}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    const grouped: Record<string, HistoryEntry[]> = {};
    history.forEach((e) => {
      if (!grouped[e.workout]) grouped[e.workout] = [];
      grouped[e.workout].push(e);
    });

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
          {(["A", "B"] as WorkoutKey[]).map((k) => {
            const entries = grouped[k];
            if (!entries || entries.length === 0) return null;
            const workout = WORKOUTS[k];
            return (
              <div key={k} style={{ marginBottom: 34 }}>
                <div style={styles.groupHeader}>
                  <span style={{ fontSize: 19 }}>{workout.emoji}</span>
                  <span style={styles.groupName}>{workout.name}</span>
                  <span style={styles.groupRule} />
                  <span style={styles.groupCount}>{`${entries.length} ${entries.length === 1 ? "SESSÃO" : "SESSÕES"}`}</span>
                </div>
                {entries.slice().reverse().map((e, i) => (
                  <button key={i} onClick={() => setHistoryView(e)} style={styles.histEntry}>
                    <span style={styles.histEntryLeft}>
                      <span style={styles.histEntryDate}>{formatDateDisplay(e.date)}</span>
                      <span style={styles.histEntryWeek}>{e.sessionId || `S${e.week}`}</span>
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

  if (!workoutKey) return shell(<div style={styles.loadingWrap}>—</div>);

  const workout = WORKOUTS[workoutKey];
  const exercise = getCurrentExercise();
  if (!exercise) return shell(<div style={styles.loadingWrap}>—</div>);
  const upcoming = getUpcomingExercises();
  const lastKg = lastWeights[exercise.id];
  const week = getCurrentWeek();
  const badgeColor = getPhaseInfo(week).color;
  const doneSets = sessionLog[exercise.id] || [];
  const phaseAnim = phaseExiting ? "tabPhaseOut .17s ease forwards" : `tabPhaseIn .38s ${EASE} both`;

  return shell(
    <div key={screenTick} style={{ animation: screenAnim }}>
      <div style={styles.workoutNav}>
        <span style={styles.workoutNavLeft}>
          <span style={styles.workoutNavTitle}>{`${workout.emoji}  ${workout.name}`}</span>
          <span style={{ ...styles.weekBadge, background: badgeColor }}>{sessionId}</span>
        </span>
        <button onClick={finishEarly} style={styles.exitBtn}>Encerrar</button>
      </div>
      <div style={styles.currentCard}>
        <div key={exerciseIndex} style={{ animation: `tabExIn .42s ${EASE} both` }}>
          <div style={styles.currentLabel}>EXERCÍCIO ATUAL</div>
          <h2 style={styles.currentName}>{exercise.name}</h2>
          <div style={styles.currentReps}>{exercise.holdSeconds ? exercise.reps + " por série" : exercise.reps + " reps"}</div>
          {lastKg > 0 && phase === "active" && (
            <div style={styles.lastKgHint}>{`Última carga: ${lastKg}kg${exercise.unit === "halter" ? " cada" : ""}`}</div>
          )}
        </div>
        <div style={styles.setsRow}>
          {Array.from({ length: exercise.sets }).map((_, i) => {
            const isDone = doneSets.some((s) => s.set === i + 1);
            const isCurrent = i === currentSet && !isDone;
            return (
              <div key={i} style={{ ...styles.setDot, background: isDone ? C.green : isCurrent ? C.accent : C.bgHeader, borderColor: isCurrent ? C.accent : "transparent", transform: isCurrent ? "scale(1.06)" : "scale(1)", animation: isCurrent ? "tabDotPulse 2.2s ease-in-out infinite" : "none" }}>
                <span style={{ ...styles.setDotText, color: isDone || isCurrent ? C.bgDark : C.midGray }}>{`${i + 1}ª`}</span>
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
                <svg width="168" height="168" viewBox="0 0 168 168" style={{ transform: "rotate(-90deg)" }}>
                  <circle cx="84" cy="84" r={RING_R} fill="none" stroke={C.bgHeader} strokeWidth="8" />
                  <circle cx="84" cy="84" r={RING_R} fill="none" stroke={C.accent} strokeWidth="8" strokeLinecap="round" strokeDasharray={RING_CIRC} strokeDashoffset={RING_CIRC * (1 - holdTime / (exercise.holdSeconds || 40))} style={{ transition: "stroke-dashoffset 1s linear" }} />
                </svg>
              </div>
              <div style={styles.ringCenter}>
                <span style={styles.restTimer}>{holdTime}</span>
                <span style={styles.restUnit}>SEG</span>
              </div>
              <div style={{ ...styles.nextUp, color: C.accent }}>{`${currentSet + 1}ª de ${exercise.sets} séries`}</div>
            </div>
          )}
          {phase === "input" && (
            <div>
              <label style={styles.inputLabel}>{exercise.unit === "halter" ? "KG por halter" : "KG total"}</label>
              <div style={styles.inputRow}>
                <button className="tab-press" onClick={() => setKgInput(String(Math.max(0, (parseFloat(kgInput) || 0) - 2.5)))} style={styles.kgAdjBtn}>−</button>
                <input type="number" inputMode="decimal" value={kgInput} onChange={(e) => setKgInput(e.target.value)} style={styles.kgInput} autoFocus placeholder="0" />
                <button className="tab-press" onClick={() => setKgInput(String((parseFloat(kgInput) || 0) + 2.5))} style={styles.kgAdjBtn}>+</button>
              </div>
              <div style={styles.unitHint}>{exercise.unit === "halter" ? "🏋️ cada halter" : "🏋️ peso total na máquina/barra"}</div>
              <button className="tab-press" onClick={handleKgSubmit} style={styles.confirmBtn}>CONFIRMAR</button>
            </div>
          )}
          {phase === "rest" && (
            <div style={styles.restWrap}>
              <div style={styles.restLabel}>DESCANSO</div>
              <div style={styles.ringWrap}>
                <svg width="168" height="168" viewBox="0 0 168 168" style={{ transform: "rotate(-90deg)" }}>
                  <circle cx="84" cy="84" r={RING_R} fill="none" stroke={C.bgHeader} strokeWidth="8" />
                  <circle cx="84" cy="84" r={RING_R} fill="none" stroke={C.accent} strokeWidth="8" strokeLinecap="round" strokeDasharray={RING_CIRC} strokeDashoffset={RING_CIRC * (1 - restTime / REST_SECONDS)} style={{ transition: "stroke-dashoffset 1s linear" }} />
                </svg>
              </div>
              <div style={styles.ringCenter}>
                <span style={styles.restTimer}>{restTime}</span>
                <span style={styles.restUnit}>SEG</span>
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
        <div style={styles.upcomingList}>
          {upcoming.map((ex) => {
            const isDone = completedExercises.has(ex.idx);
            const lw = lastWeights[ex.id];
            return (
              <div key={ex.idx} style={{ ...styles.upcomingItem, opacity: isDone ? 0.32 : 1 }}>
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
    </div>
  );
}
