import type { SupabaseClient } from "@supabase/supabase-js";
import type { HistoryEntry, SessionLog, WorkoutKey } from "./workouts";

export async function getHistory(supabase: SupabaseClient): Promise<HistoryEntry[]> {
  const { data, error } = await supabase
    .from("workout_sessions")
    .select("date, workout, week, session_id, exercises")
    .order("date", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((row) => ({
    date: row.date,
    workout: row.workout as WorkoutKey,
    week: row.week,
    sessionId: row.session_id,
    exercises: row.exercises as SessionLog,
  }));
}

export async function getLastWeights(supabase: SupabaseClient): Promise<Record<string, number>> {
  const { data, error } = await supabase.from("last_weights").select("exercise_id, kg");
  if (error) throw error;

  const weights: Record<string, number> = {};
  for (const row of data ?? []) weights[row.exercise_id] = Number(row.kg);
  return weights;
}

export async function saveSession(
  supabase: SupabaseClient,
  entry: { date: string; workout: WorkoutKey; week: number; sessionId: string; exercises: SessionLog }
): Promise<void> {
  const { error } = await supabase.from("workout_sessions").insert({
    date: entry.date,
    workout: entry.workout,
    week: entry.week,
    session_id: entry.sessionId,
    exercises: entry.exercises,
  });
  if (error) throw error;
}

export async function upsertLastWeights(
  supabase: SupabaseClient,
  weights: Record<string, number>
): Promise<void> {
  const rows = Object.entries(weights).map(([exercise_id, kg]) => ({ exercise_id, kg }));
  if (rows.length === 0) return;
  const { error } = await supabase
    .from("last_weights")
    .upsert(rows, { onConflict: "user_id,exercise_id" });
  if (error) throw error;
}
