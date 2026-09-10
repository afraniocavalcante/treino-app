-- Per-exercise notes (safety/technique reminders) and rest-time override,
-- since a single program-wide rest_seconds can't represent a plan with
-- different rest windows per exercise (isolators vs heavy compounds).

alter table public.program_workout_exercises add column if not exists notes text;
alter table public.program_workout_exercises add column if not exists rest_seconds integer;
