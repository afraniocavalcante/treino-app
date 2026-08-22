import type { SupabaseClient } from "@supabase/supabase-js";
import {
  isProgramEnded,
  type ExerciseUnit,
  type HistoryEntry,
  type LibraryExercise,
  type PhaseColor,
  type Program,
  type ProgramWorkout,
  type SessionLog,
} from "./program";

export async function getHistory(supabase: SupabaseClient): Promise<HistoryEntry[]> {
  const { data, error } = await supabase
    .from("workout_sessions")
    .select("id, date, workout, program_id, program_workout_id, session_id, exercises")
    .order("date", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    date: row.date,
    programId: row.program_id,
    programWorkoutId: row.program_workout_id,
    workoutLabel: row.workout,
    sessionLabel: row.session_id,
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
  entry: {
    date: string;
    week: number;
    programId: string;
    programWorkoutId: string;
    workoutLabel: string;
    sessionLabel: string;
    exercises: SessionLog;
  }
): Promise<string> {
  const { data, error } = await supabase
    .from("workout_sessions")
    .insert({
      date: entry.date,
      week: entry.week,
      program_id: entry.programId,
      program_workout_id: entry.programWorkoutId,
      workout: entry.workoutLabel,
      session_id: entry.sessionLabel,
      exercises: entry.exercises,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
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

export async function getExerciseLibrary(supabase: SupabaseClient): Promise<LibraryExercise[]> {
  const { data, error } = await supabase
    .from("exercise_library")
    .select("id, name, unit, hold_seconds")
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    unit: row.unit as ExerciseUnit,
    holdSeconds: row.hold_seconds,
  }));
}

export async function addLibraryExercise(
  supabase: SupabaseClient,
  ex: { name: string; unit: ExerciseUnit; holdSeconds: number | null }
): Promise<LibraryExercise> {
  const id = crypto.randomUUID();
  const { data, error } = await supabase
    .from("exercise_library")
    .insert({ id, name: ex.name, unit: ex.unit, hold_seconds: ex.holdSeconds })
    .select("id, name, unit, hold_seconds")
    .single();
  if (error) throw error;
  return { id: data.id, name: data.name, unit: data.unit as ExerciseUnit, holdSeconds: data.hold_seconds };
}

async function loadProgramWorkouts(supabase: SupabaseClient, programId: string): Promise<ProgramWorkout[]> {
  const { data: workoutRows, error: wErr } = await supabase
    .from("program_workouts")
    .select("id, name, emoji, order_index")
    .eq("program_id", programId)
    .order("order_index", { ascending: true });
  if (wErr) throw wErr;

  const workouts: ProgramWorkout[] = [];
  for (const w of workoutRows ?? []) {
    const { data: exRows, error: exErr } = await supabase
      .from("program_workout_exercises")
      .select("id, exercise_id, order_index, sets, reps, hold_seconds, exercise_library(name, unit)")
      .eq("program_workout_id", w.id)
      .order("order_index", { ascending: true });
    if (exErr) throw exErr;

    workouts.push({
      id: w.id,
      name: w.name,
      emoji: w.emoji,
      orderIndex: w.order_index,
      exercises: (exRows ?? []).map((row) => {
        const lib = row.exercise_library as unknown as { name: string; unit: ExerciseUnit };
        return {
          id: row.id,
          exerciseId: row.exercise_id,
          name: lib?.name ?? "Exercício",
          unit: lib?.unit ?? "total",
          sets: row.sets,
          reps: row.reps,
          holdSeconds: row.hold_seconds,
          orderIndex: row.order_index,
        };
      }),
    });
  }
  return workouts;
}

async function loadProgram(supabase: SupabaseClient, row: {
  id: string; name: string; start_date: string; weeks: number; rest_seconds: number; status: string;
}): Promise<Program> {
  const [workouts, phaseRows] = await Promise.all([
    loadProgramWorkouts(supabase, row.id),
    supabase
      .from("program_phases")
      .select("id, name, description, start_week, end_week, color")
      .eq("program_id", row.id)
      .order("order_index", { ascending: true }),
  ]);
  if (phaseRows.error) throw phaseRows.error;

  return {
    id: row.id,
    name: row.name,
    startDate: row.start_date,
    weeks: row.weeks,
    restSeconds: row.rest_seconds,
    status: row.status as "active" | "completed",
    workouts,
    phases: (phaseRows.data ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      startWeek: p.start_week,
      endWeek: p.end_week,
      color: p.color as PhaseColor,
    })),
  };
}

export async function getActiveProgram(supabase: SupabaseClient): Promise<Program | null> {
  const { data, error } = await supabase
    .from("programs")
    .select("id, name, start_date, weeks, rest_seconds, status")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const program = await loadProgram(supabase, data);
  if (isProgramEnded(program)) {
    await supabase.from("programs").update({ status: "completed" }).eq("id", program.id);
    return null;
  }
  return program;
}

export async function createProgram(
  supabase: SupabaseClient,
  input: { name: string; startDate: string; weeks: number; restSeconds: number }
): Promise<Program> {
  await supabase.from("programs").update({ status: "completed" }).eq("status", "active");

  const { data, error } = await supabase
    .from("programs")
    .insert({
      name: input.name,
      start_date: input.startDate,
      weeks: input.weeks,
      rest_seconds: input.restSeconds,
      status: "active",
    })
    .select("id, name, start_date, weeks, rest_seconds, status")
    .single();
  if (error) throw error;

  return loadProgram(supabase, data);
}

export async function addProgramWorkout(
  supabase: SupabaseClient,
  programId: string,
  input: { name: string; emoji: string; orderIndex: number }
): Promise<string> {
  const { data, error } = await supabase
    .from("program_workouts")
    .insert({ program_id: programId, name: input.name, emoji: input.emoji, order_index: input.orderIndex })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function deleteProgramWorkout(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from("program_workouts").delete().eq("id", id);
  if (error) throw error;
}

export async function addProgramWorkoutExercise(
  supabase: SupabaseClient,
  programWorkoutId: string,
  input: { exerciseId: string; sets: number; reps: string; holdSeconds: number | null; orderIndex: number }
): Promise<void> {
  const { error } = await supabase.from("program_workout_exercises").insert({
    program_workout_id: programWorkoutId,
    exercise_id: input.exerciseId,
    sets: input.sets,
    reps: input.reps,
    hold_seconds: input.holdSeconds,
    order_index: input.orderIndex,
  });
  if (error) throw error;
}

export async function deleteProgramWorkoutExercise(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from("program_workout_exercises").delete().eq("id", id);
  if (error) throw error;
}

export async function addProgramPhase(
  supabase: SupabaseClient,
  programId: string,
  input: { name: string; description: string; startWeek: number; endWeek: number; color: PhaseColor; orderIndex: number }
): Promise<void> {
  const { error } = await supabase.from("program_phases").insert({
    program_id: programId,
    name: input.name,
    description: input.description || null,
    start_week: input.startWeek,
    end_week: input.endWeek,
    color: input.color,
    order_index: input.orderIndex,
  });
  if (error) throw error;
}

export async function deleteProgramPhase(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from("program_phases").delete().eq("id", id);
  if (error) throw error;
}
