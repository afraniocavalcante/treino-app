import { registerPlugin, type PluginListenerHandle } from "@capacitor/core";
import type { ExerciseUnit, SessionLog } from "./program";

/** Enxuto de propósito — só o que o relógio precisa pra rodar o treino sozinho. */
export interface WatchWorkoutExercise {
  id: string; // exerciseId — mesma chave usada em SessionLog
  name: string;
  unit: ExerciseUnit;
  sets: number;
  reps: string; // ex. "8-12", só exibição
  restSeconds: number;
  lastKg: number | null; // sugestão inicial, ajustável na coroa
}

export interface WatchTodayWorkout {
  programId: string;
  programWorkoutId: string;
  workoutLabel: string;
  workoutEmoji: string | null;
  sessionLabel: string;
  exercises: WatchWorkoutExercise[];
}

/** O que o relógio manda de volta ao terminar o treino. */
export interface WatchCompletedSession {
  programId: string;
  programWorkoutId: string;
  workoutLabel: string;
  workoutEmoji: string | null;
  sessionLabel: string;
  date: string; // yyyy-mm-dd
  exercises: SessionLog;
}

interface WatchBridgeNativePlugin {
  sendTodayWorkout(options: { workout: WatchTodayWorkout }): Promise<void>;
  drainPendingSessions(): Promise<{ sessions: WatchCompletedSession[] }>;
  addListener(
    eventName: "sessionReceived",
    listenerFunc: (data: { pendingCount: number }) => void
  ): Promise<PluginListenerHandle>;
}

const WatchBridge = registerPlugin<WatchBridgeNativePlugin>("WatchBridge");

export async function sendTodayWorkout(workout: WatchTodayWorkout): Promise<void> {
  await WatchBridge.sendTodayWorkout({ workout }).catch((err) => {
    // O relógio pode simplesmente não existir/estar pareado — não é erro do usuário.
    console.error("Falha ao enviar o treino de hoje pro Apple Watch:", err);
  });
}

/** Busca sessões concluídas no relógio que ainda não foram processadas. */
export async function drainPendingSessions(): Promise<WatchCompletedSession[]> {
  try {
    const { sessions } = await WatchBridge.drainPendingSessions();
    return sessions ?? [];
  } catch {
    return [];
  }
}

/** Assina o aviso de "chegou sessão nova" — só um sinal; o payload vem via drainPendingSessions. */
export async function onSessionReceived(callback: () => void): Promise<PluginListenerHandle> {
  try {
    return await WatchBridge.addListener("sessionReceived", () => callback());
  } catch {
    // Plugin não existe nessa plataforma (ex. navegador) — nada pra escutar.
    return { remove: async () => {} };
  }
}
