-- Treino A/B schema

create table if not exists public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date date not null,
  workout text not null check (workout in ('A', 'B')),
  week integer not null,
  session_id text not null,
  exercises jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists workout_sessions_user_id_date_idx
  on public.workout_sessions (user_id, date);

alter table public.workout_sessions enable row level security;

drop policy if exists "select own sessions" on public.workout_sessions;
create policy "select own sessions" on public.workout_sessions
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "insert own sessions" on public.workout_sessions;
create policy "insert own sessions" on public.workout_sessions
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "update own sessions" on public.workout_sessions;
create policy "update own sessions" on public.workout_sessions
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "delete own sessions" on public.workout_sessions;
create policy "delete own sessions" on public.workout_sessions
  for delete to authenticated
  using ((select auth.uid()) = user_id);

create table if not exists public.last_weights (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  exercise_id text not null,
  kg numeric not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, exercise_id)
);

alter table public.last_weights enable row level security;

drop policy if exists "select own weights" on public.last_weights;
create policy "select own weights" on public.last_weights
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "insert own weights" on public.last_weights;
create policy "insert own weights" on public.last_weights
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "update own weights" on public.last_weights;
create policy "update own weights" on public.last_weights
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "delete own weights" on public.last_weights;
create policy "delete own weights" on public.last_weights
  for delete to authenticated
  using ((select auth.uid()) = user_id);
