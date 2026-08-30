-- Preserve the workout's emoji at the time it was trained, so history entries
-- from a since-completed program keep their emoji instead of falling back to
-- plain text once the program's own workout row is no longer the active one.

alter table public.workout_sessions add column if not exists workout_emoji text;
