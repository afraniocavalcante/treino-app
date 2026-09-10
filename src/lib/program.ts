import { C } from "./styles";

export type ExerciseUnit = "total" | "halter" | "corpo";
export type PhaseColor = "accent" | "green" | "blue" | "red";

export const PHASE_COLOR_HEX: Record<PhaseColor, string> = {
  accent: C.accent,
  green: C.green,
  blue: "#4A90E2",
  red: C.red,
};

export const MUSCLE_GROUPS = [
  "Peito", "Costas", "Ombro", "Bíceps", "Tríceps", "Pernas", "Glúteo", "Panturrilha", "Core", "Cardio",
] as const;
export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

export interface LibraryExercise {
  id: string;
  name: string;
  unit: ExerciseUnit;
  holdSeconds: number | null;
  gifUrl: string | null;
  muscleGroup: MuscleGroup | null;
}

export interface ProgramWorkoutExercise {
  id: string;
  exerciseId: string;
  name: string;
  unit: ExerciseUnit;
  sets: number;
  reps: string;
  holdSeconds: number | null;
  restSeconds: number | null;
  notes: string | null;
  orderIndex: number;
}

export interface ProgramWorkout {
  id: string;
  name: string;
  emoji: string;
  orderIndex: number;
  exercises: ProgramWorkoutExercise[];
}

export interface ProgramPhase {
  id: string;
  name: string;
  description: string | null;
  startWeek: number;
  endWeek: number;
  color: PhaseColor;
}

export interface Program {
  id: string;
  name: string;
  startDate: string;
  weeks: number;
  restSeconds: number;
  status: "active" | "scheduled" | "completed";
  workouts: ProgramWorkout[];
  phases: ProgramPhase[];
}

export interface SetEntry {
  set: number;
  kg: number;
  reps: number | null;
}

/** Parses the top of a prescribed rep range ("8-12" -> 12, "10" -> 10) for prefilling the reps input. */
export function parseTopReps(reps: string): number | null {
  const nums = reps.match(/\d+/g);
  if (!nums || nums.length === 0) return null;
  return Number(nums[nums.length - 1]);
}

export type SessionLog = Record<string, SetEntry[]>;

export interface HistoryEntry {
  id: string;
  date: string;
  programId: string | null;
  programWorkoutId: string | null;
  workoutLabel: string;
  workoutEmoji: string | null;
  sessionLabel: string;
  exercises: SessionLog;
}

export function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function formatDateDisplay(str: string): string {
  const [, m, d] = str.split("-");
  return `${d}/${m}`;
}

const TRAINING_DAYS_PER_WEEK = 6;

export function isProgramEnded(program: Program, trainedDayCount: number): boolean {
  return trainedDayCount >= program.weeks * TRAINING_DAYS_PER_WEEK;
}

function getTrainedDaysBeforeToday(program: Program, history: HistoryEntry[]): number {
  const today = formatDate(new Date());
  return new Set(
    history.filter((e) => e.programId === program.id && e.date < today).map((e) => e.date)
  ).size;
}

export function getCurrentWeek(program: Program, history: HistoryEntry[]): number {
  const trainedBefore = getTrainedDaysBeforeToday(program, history);
  return Math.min(program.weeks, Math.floor(trainedBefore / TRAINING_DAYS_PER_WEEK) + 1);
}

export function getPhaseInfo(program: Program, week: number) {
  const phase = program.phases.find((p) => week >= p.startWeek && week <= p.endWeek);
  if (phase) return { name: phase.name, desc: phase.description ?? "", color: PHASE_COLOR_HEX[phase.color] };
  return { name: `Semana ${week}`, desc: "", color: C.accent };
}

function workoutLetter(orderIndex: number): string {
  return String.fromCharCode(65 + orderIndex);
}

export function getNextWorkoutIndex(program: Program, history: HistoryEntry[]): number {
  if (program.workouts.length === 0) return -1;
  const relevant = history.filter((e) => e.programId === program.id && e.programWorkoutId);
  if (relevant.length === 0) return 0;
  const last = relevant[relevant.length - 1];
  const lastIdx = program.workouts.findIndex((w) => w.id === last.programWorkoutId);
  if (lastIdx === -1) return 0;
  return (lastIdx + 1) % program.workouts.length;
}

const TRAINING_STREAK_LEN = 6;

export function getTrainedDateSet(history: HistoryEntry[]): Set<string> {
  return new Set(history.map((e) => e.date));
}

export function getTrainingWeekMap(program: Program, history: HistoryEntry[]): Map<string, number> {
  const trainedDatesSorted = [...new Set(history.filter((e) => e.programId === program.id).map((e) => e.date))].sort();
  const map = new Map<string, number>();
  trainedDatesSorted.forEach((date, i) => {
    map.set(date, Math.floor(i / TRAINING_DAYS_PER_WEEK) + 1);
  });
  return map;
}

function simulateSchedule(program: Program, history: HistoryEntry[], uptoDateStr: string) {
  const trainedDates = getTrainedDateSet(history);
  const trackedDates = [...trainedDates].sort();
  const trackingStart = trackedDates[0] ?? null;
  const today = formatDate(new Date());
  const restDays = new Set<string>();
  let streak = 0;
  const cursor = parseDate(program.startDate);
  const target = parseDate(uptoDateStr);
  while (cursor <= target) {
    const cStr = formatDate(cursor);
    if (!restDays.has(cStr)) {
      const trained = trainedDates.has(cStr);
      const verifiableMiss = !trained && trackingStart !== null && cStr >= trackingStart && cStr < today;
      if (verifiableMiss) {
        streak = 0;
      } else {
        streak += 1;
        if (streak >= TRAINING_STREAK_LEN) {
          const rest = new Date(cursor);
          rest.setDate(rest.getDate() + 1);
          restDays.add(formatDate(rest));
          streak = 0;
        }
      }
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return { restDays, streak };
}

export function isRestDay(program: Program, history: HistoryEntry[], dateStr: string): boolean {
  return simulateSchedule(program, history, dateStr).restDays.has(dateStr);
}

export function getTrainingStreak(program: Program, history: HistoryEntry[]): number {
  const todayDate = new Date();
  const today = formatDate(todayDate);
  if (getTrainedDateSet(history).has(today)) {
    return simulateSchedule(program, history, today).streak;
  }
  const yesterday = new Date(todayDate);
  yesterday.setDate(yesterday.getDate() - 1);
  return simulateSchedule(program, history, formatDate(yesterday)).streak;
}

export function getSessionLabel(program: Program, workout: ProgramWorkout, history: HistoryEntry[]): string {
  const week = getCurrentWeek(program, history);
  const relevant = history.filter((e) => e.programId === program.id);
  const trainedDatesSorted = [...new Set(relevant.map((e) => e.date))].sort();
  const bucketDates = new Set(trainedDatesSorted.slice((week - 1) * TRAINING_DAYS_PER_WEEK, week * TRAINING_DAYS_PER_WEEK));
  const count = relevant.filter((e) => e.programWorkoutId === workout.id && bucketDates.has(e.date)).length;
  return `${workoutLetter(workout.orderIndex)}${count + 1}S${week}`;
}

export interface ExercisePoint {
  date: string;
  kg: number;
}

export function getExerciseSeries(history: HistoryEntry[], exerciseId: string): ExercisePoint[] {
  return history
    .filter((e) => e.exercises[exerciseId] && e.exercises[exerciseId].length > 0)
    .map((e) => ({
      date: e.date,
      kg: Math.max(...e.exercises[exerciseId].map((s) => s.kg || 0)),
    }))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}
