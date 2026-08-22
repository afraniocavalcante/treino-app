import { createClient } from "@supabase/supabase-js";

const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const WORKOUTS = {
  A: {
    name: "Treino A",
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

const { data: users, error: usersErr } = await admin.auth.admin.listUsers();
if (usersErr) throw usersErr;
const userId = users.users[0].id;
console.log("Migrating for user", userId);

const libraryRows = [];
for (const key of ["A", "B"]) {
  for (const ex of WORKOUTS[key].exercises) {
    libraryRows.push({
      id: ex.id,
      user_id: userId,
      name: ex.name,
      unit: ex.unit,
      hold_seconds: ex.holdSeconds ?? null,
    });
  }
}
const { error: libErr } = await admin.from("exercise_library").upsert(libraryRows, { onConflict: "id" });
if (libErr) throw libErr;
console.log("Seeded exercise_library:", libraryRows.length, "exercises");

const { data: program, error: progErr } = await admin
  .from("programs")
  .insert({
    user_id: userId,
    name: "Programa 1",
    start_date: "2026-08-17",
    weeks: 4,
    rest_seconds: 90,
    status: "active",
  })
  .select()
  .single();
if (progErr) throw progErr;
console.log("Created program:", program.id);

const { error: phaseErr } = await admin.from("program_phases").insert([
  { program_id: program.id, user_id: userId, name: "Adaptação", description: "Foco em forma e achar cargas", start_week: 1, end_week: 2, color: "accent", order_index: 0 },
  { program_id: program.id, user_id: userId, name: "Progressão", description: "Empurrar carga nos compostos", start_week: 3, end_week: 4, color: "green", order_index: 1 },
]);
if (phaseErr) throw phaseErr;
console.log("Created phases");

const workoutIdByKey = {};
let orderIndex = 0;
for (const key of ["A", "B"]) {
  const { data: pw, error: pwErr } = await admin
    .from("program_workouts")
    .insert({
      program_id: program.id,
      user_id: userId,
      name: WORKOUTS[key].name,
      emoji: WORKOUTS[key].emoji,
      order_index: orderIndex,
    })
    .select()
    .single();
  if (pwErr) throw pwErr;
  workoutIdByKey[key] = pw.id;
  orderIndex++;

  const exRows = WORKOUTS[key].exercises.map((ex, i) => ({
    program_workout_id: pw.id,
    user_id: userId,
    exercise_id: ex.id,
    order_index: i,
    sets: ex.sets,
    reps: ex.reps,
    hold_seconds: ex.holdSeconds ?? null,
  }));
  const { error: pweErr } = await admin.from("program_workout_exercises").insert(exRows);
  if (pweErr) throw pweErr;
  console.log(`Created program_workout ${key} (${pw.id}) with ${exRows.length} exercises`);
}

const { data: sessions, error: sessErr } = await admin.from("workout_sessions").select("id, workout");
if (sessErr) throw sessErr;
for (const s of sessions) {
  const pwId = workoutIdByKey[s.workout];
  if (!pwId) continue;
  await admin.from("workout_sessions").update({ program_id: program.id, program_workout_id: pwId }).eq("id", s.id);
}
console.log("Linked", sessions.length, "existing session(s) to the new program");

console.log("Done. Program ID:", program.id);
