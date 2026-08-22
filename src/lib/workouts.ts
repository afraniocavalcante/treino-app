export type ExerciseUnit = "total" | "halter" | "corpo";

export interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: string;
  unit: ExerciseUnit;
  holdSeconds?: number;
}

export interface Workout {
  name: string;
  subtitle: string;
  emoji: string;
  exercises: Exercise[];
}

export type WorkoutKey = "A" | "B";

export interface SetEntry {
  set: number;
  kg: number;
}

export type SessionLog = Record<string, SetEntry[]>;

export interface HistoryEntry {
  date: string;
  workout: WorkoutKey;
  week: number;
  sessionId: string;
  exercises: SessionLog;
}

export const WORKOUTS: Record<WorkoutKey, Workout> = {
  A: {
    name: "Treino A",
    subtitle: "Superior",
    emoji: "🔥",
    exercises: [
      { id: "a1", name: "Supino máquina/halteres", sets: 3, reps: "8–12", unit: "total" },
      { id: "a2", name: "Supino inclinado", sets: 3, reps: "8–12", unit: "total" },
      { id: "a3", name: "Crucifixo máq/crossover", sets: 2, reps: "12–15", unit: "total" },
      { id: "a4", name: "Puxada alta", sets: 3, reps: "8–12", unit: "total" },
      { id: "a5", name: "Remada baixa/máquina", sets: 3, reps: "10–12", unit: "total" },
      { id: "a6", name: "Face pull", sets: 2, reps: "15", unit: "total" },
      { id: "a7", name: "Desenvolvimento máquina", sets: 3, reps: "10–12", unit: "total" },
      { id: "a8", name: "Elevação lateral", sets: 3, reps: "12–15", unit: "halter" },
      { id: "a9", name: "Rosca direta/máquina", sets: 2, reps: "10–12", unit: "total" },
      { id: "a10", name: "Tríceps na polia", sets: 2, reps: "10–12", unit: "total" },
      { id: "a11", name: "Rosca martelo", sets: 2, reps: "10–12", unit: "halter" },
    ],
  },
  B: {
    name: "Treino B",
    subtitle: "Inferior + Core",
    emoji: "🦵",
    exercises: [
      { id: "b1", name: "Leg press 45°", sets: 4, reps: "10–12", unit: "total" },
      { id: "b2", name: "Mesa flexora", sets: 3, reps: "12–15", unit: "total" },
      { id: "b3", name: "Cadeira extensora", sets: 2, reps: "12–15", unit: "total" },
      { id: "b4", name: "Abdução na máquina", sets: 3, reps: "15", unit: "total" },
      { id: "b5", name: "Adução na máquina", sets: 3, reps: "15", unit: "total" },
      { id: "b6", name: "Stiff com halteres", sets: 3, reps: "10–12", unit: "halter" },
      { id: "b7", name: "Panturrilha", sets: 3, reps: "15–20", unit: "total" },
      { id: "b8", name: "Prancha frontal", sets: 3, reps: "40s", unit: "corpo", holdSeconds: 40 },
      { id: "b9", name: "Abdominal máq/crunch", sets: 3, reps: "12–15", unit: "total" },
      { id: "b10", name: "Lombar/hiperextensão", sets: 2, reps: "12–15", unit: "corpo" },
    ],
  },
};

export const REST_SECONDS = 90;
export const PROGRAM_START = new Date("2026-08-17");

export function getCurrentWeek(): number {
  const days = Math.floor((Date.now() - PROGRAM_START.getTime()) / 86400000);
  return Math.min(4, Math.max(1, Math.floor(days / 7) + 1));
}

export function getPhaseInfo(week: number) {
  if (week <= 2) return { phase: "Adaptação", desc: "Foco em forma e achar cargas", color: "#E8FF47" };
  return { phase: "Progressão", desc: "Empurrar carga nos compostos", color: "#2ED573" };
}

export function getTodayWorkout(): WorkoutKey | null {
  const map: Record<number, WorkoutKey | null> = { 1: "A", 2: "B", 3: "A", 4: "B", 5: "A", 6: "B", 0: null };
  return map[new Date().getDay()];
}

export function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function formatDateDisplay(str: string): string {
  const [, m, d] = str.split("-");
  return `${d}/${m}`;
}

export function getSessionId(wKey: WorkoutKey, historyEntries: HistoryEntry[]): string {
  const week = getCurrentWeek();
  const start = new Date(PROGRAM_START);
  start.setDate(start.getDate() + (week - 1) * 7);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  const startStr = formatDate(start);
  const endStr = formatDate(end);
  const count = historyEntries.filter(
    (e) => e.workout === wKey && e.date >= startStr && e.date < endStr
  ).length;
  return `${wKey}${count + 1}S${week}`;
}
