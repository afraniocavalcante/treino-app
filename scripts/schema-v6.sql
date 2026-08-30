-- Muscle group tagging for the exercise library (enables search/filter by group).

alter table public.exercise_library add column if not exists muscle_group text;
