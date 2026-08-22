import { C } from "./styles";

export type ExerciseUnit = "total" | "halter" | "corpo";
export type PhaseColor = "accent" | "green" | "blue" | "red";

export const PHASE_COLOR_HEX: Record<PhaseColor, string> = {
  accent: C.accent,
  green: C.green,
  blue: "#4A90E2",
  red: C.red,
};

export interface LibraryExercise {
  id: string;
  name: string;
  unit: ExerciseUnit;
  holdSeconds: number | null;
}

export interface ProgramWorkoutExercise {
  id: string;
  exerciseId: string;
  name: string;
  unit: ExerciseUnit;
  sets: number;
  reps: string;
  holdSeconds: number | null;
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
  status: "active" | "completed";
  workouts: ProgramWorkout[];
  phases: ProgramPhase[];
}

export interface SetEntry {
  set: number;
  kg: number;
}

export type SessionLog = Record<string, SetEntry[]>;

export interface HistoryEntry {
  id: string;
  date: string;
  programId: string | null;
  programWorkoutId: string | null;
  workoutLabel: string;
  sessionLabel: string;
  exercises: SessionLog;
}

export function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function formatDateDisplay(str: string): string {
  const [, m, d] = str.split("-");
  return `${d}/${m}`;
}

export function getProgramEndDate(program: Program): Date {
  const end = new Date(program.startDate);
  end.setDate(end.getDate() + program.weeks * 7);
  return end;
}

export function isProgramEnded(program: Program): boolean {
  return Date.now() >= getProgramEndDate(program).getTime();
}

export function getCurrentWeek(program: Program): number {
  const start = new Date(program.startDate);
  const days = Math.floor((Date.now() - start.getTime()) / 86400000);
  return Math.min(program.weeks, Math.max(1, Math.floor(days / 7) + 1));
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
  const count = history.filter((e) => e.programId === program.id).length;
  return count % program.workouts.length;
}

export function getSessionLabel(program: Program, workout: ProgramWorkout, history: HistoryEntry[]): string {
  const week = getCurrentWeek(program);
  const start = new Date(program.startDate);
  start.setDate(start.getDate() + (week - 1) * 7);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  const startStr = formatDate(start);
  const endStr = formatDate(end);
  const count = history.filter(
    (e) => e.programWorkoutId === workout.id && e.date >= startStr && e.date < endStr
  ).length;
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
