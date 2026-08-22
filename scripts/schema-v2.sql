-- Programs, exercise library, and rotation-based workout definitions

create table if not exists public.exercise_library (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  unit text not null check (unit in ('total', 'halter', 'corpo')),
  hold_seconds integer,
  created_at timestamptz not null default now()
);

alter table public.exercise_library enable row level security;

drop policy if exists "select own exercises" on public.exercise_library;
create policy "select own exercises" on public.exercise_library
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "insert own exercises" on public.exercise_library;
create policy "insert own exercises" on public.exercise_library
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "update own exercises" on public.exercise_library;
create policy "update own exercises" on public.exercise_library
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "delete own exercises" on public.exercise_library;
create policy "delete own exercises" on public.exercise_library
  for delete to authenticated using ((select auth.uid()) = user_id);

create table if not exists public.programs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  start_date date not null,
  weeks integer not null,
  rest_seconds integer not null default 90,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now()
);

alter table public.programs enable row level security;

drop policy if exists "select own programs" on public.programs;
create policy "select own programs" on public.programs
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "insert own programs" on public.programs;
create policy "insert own programs" on public.programs
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "update own programs" on public.programs;
create policy "update own programs" on public.programs
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "delete own programs" on public.programs;
create policy "delete own programs" on public.programs
  for delete to authenticated using ((select auth.uid()) = user_id);

create table if not exists public.program_workouts (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  emoji text not null default '💪',
  order_index integer not null,
  created_at timestamptz not null default now()
);

alter table public.program_workouts enable row level security;

drop policy if exists "select own program_workouts" on public.program_workouts;
create policy "select own program_workouts" on public.program_workouts
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "insert own program_workouts" on public.program_workouts;
create policy "insert own program_workouts" on public.program_workouts
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "update own program_workouts" on public.program_workouts;
create policy "update own program_workouts" on public.program_workouts
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "delete own program_workouts" on public.program_workouts;
create policy "delete own program_workouts" on public.program_workouts
  for delete to authenticated using ((select auth.uid()) = user_id);

create table if not exists public.program_workout_exercises (
  id uuid primary key default gen_random_uuid(),
  program_workout_id uuid not null references public.program_workouts (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  exercise_id text not null references public.exercise_library (id) on delete cascade,
  order_index integer not null,
  sets integer not null,
  reps text not null,
  hold_seconds integer,
  created_at timestamptz not null default now()
);

alter table public.program_workout_exercises enable row level security;

drop policy if exists "select own pwe" on public.program_workout_exercises;
create policy "select own pwe" on public.program_workout_exercises
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "insert own pwe" on public.program_workout_exercises;
create policy "insert own pwe" on public.program_workout_exercises
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "update own pwe" on public.program_workout_exercises;
create policy "update own pwe" on public.program_workout_exercises
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "delete own pwe" on public.program_workout_exercises;
create policy "delete own pwe" on public.program_workout_exercises
  for delete to authenticated using ((select auth.uid()) = user_id);

create table if not exists public.program_phases (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  description text,
  start_week integer not null,
  end_week integer not null,
  color text not null default 'accent' check (color in ('accent', 'green', 'blue', 'red')),
  order_index integer not null,
  created_at timestamptz not null default now()
);

alter table public.program_phases enable row level security;

drop policy if exists "select own phases" on public.program_phases;
create policy "select own phases" on public.program_phases
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "insert own phases" on public.program_phases;
create policy "insert own phases" on public.program_phases
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "update own phases" on public.program_phases;
create policy "update own phases" on public.program_phases
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "delete own phases" on public.program_phases;
create policy "delete own phases" on public.program_phases
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Link workout_sessions to the program/workout that generated them (nullable for legacy rows)
alter table public.workout_sessions
  add column if not exists program_id uuid references public.programs (id) on delete set null;
alter table public.workout_sessions
  add column if not exists program_workout_id uuid references public.program_workouts (id) on delete set null;

alter table public.workout_sessions drop constraint if exists workout_sessions_workout_check;
alter table public.workout_sessions alter column workout type text;
