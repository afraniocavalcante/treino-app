-- Diet module

create table if not exists public.diet_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  kcal_target integer not null,
  protein_target integer not null,
  carb_target integer not null,
  fat_target integer not null,
  nutri_name text,
  nutri_crn text,
  objective text,
  water_goal text,
  next_consult text,
  general_rules jsonb not null default '[]'::jsonb,
  recipe jsonb,
  fruit_equivalents jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.diet_plans enable row level security;

drop policy if exists "select own diet plans" on public.diet_plans;
create policy "select own diet plans" on public.diet_plans
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "insert own diet plans" on public.diet_plans;
create policy "insert own diet plans" on public.diet_plans
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "update own diet plans" on public.diet_plans;
create policy "update own diet plans" on public.diet_plans
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "delete own diet plans" on public.diet_plans;
create policy "delete own diet plans" on public.diet_plans
  for delete to authenticated
  using ((select auth.uid()) = user_id);


create table if not exists public.diet_meals (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.diet_plans (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  key text not null,
  label text not null,
  kind text not null check (kind in ('list', 'builder')),
  order_index integer not null default 0,
  allow_portion boolean not null default false,
  has_none_option boolean not null default false,
  options jsonb,
  groups jsonb
);

create index if not exists diet_meals_plan_id_idx on public.diet_meals (plan_id, order_index);

alter table public.diet_meals enable row level security;

drop policy if exists "select own diet meals" on public.diet_meals;
create policy "select own diet meals" on public.diet_meals
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "insert own diet meals" on public.diet_meals;
create policy "insert own diet meals" on public.diet_meals
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "update own diet meals" on public.diet_meals;
create policy "update own diet meals" on public.diet_meals
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "delete own diet meals" on public.diet_meals;
create policy "delete own diet meals" on public.diet_meals
  for delete to authenticated
  using ((select auth.uid()) = user_id);


create table if not exists public.diet_supplements (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.diet_plans (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  key text not null,
  label text not null,
  timing text,
  order_index integer not null default 0
);

alter table public.diet_supplements enable row level security;

drop policy if exists "select own diet supplements" on public.diet_supplements;
create policy "select own diet supplements" on public.diet_supplements
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "insert own diet supplements" on public.diet_supplements;
create policy "insert own diet supplements" on public.diet_supplements
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "update own diet supplements" on public.diet_supplements;
create policy "update own diet supplements" on public.diet_supplements
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "delete own diet supplements" on public.diet_supplements;
create policy "delete own diet supplements" on public.diet_supplements
  for delete to authenticated
  using ((select auth.uid()) = user_id);


create table if not exists public.diet_supplement_groups (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.diet_plans (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null,
  note text,
  order_index integer not null default 0,
  items jsonb not null default '[]'::jsonb
);

alter table public.diet_supplement_groups enable row level security;

drop policy if exists "select own diet supplement groups" on public.diet_supplement_groups;
create policy "select own diet supplement groups" on public.diet_supplement_groups
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "insert own diet supplement groups" on public.diet_supplement_groups;
create policy "insert own diet supplement groups" on public.diet_supplement_groups
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "update own diet supplement groups" on public.diet_supplement_groups;
create policy "update own diet supplement groups" on public.diet_supplement_groups
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "delete own diet supplement groups" on public.diet_supplement_groups;
create policy "delete own diet supplement groups" on public.diet_supplement_groups
  for delete to authenticated
  using ((select auth.uid()) = user_id);


create table if not exists public.diet_shopping_categories (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.diet_plans (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  order_index integer not null default 0,
  items jsonb not null default '[]'::jsonb
);

alter table public.diet_shopping_categories enable row level security;

drop policy if exists "select own diet shopping categories" on public.diet_shopping_categories;
create policy "select own diet shopping categories" on public.diet_shopping_categories
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "insert own diet shopping categories" on public.diet_shopping_categories;
create policy "insert own diet shopping categories" on public.diet_shopping_categories
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "update own diet shopping categories" on public.diet_shopping_categories;
create policy "update own diet shopping categories" on public.diet_shopping_categories
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "delete own diet shopping categories" on public.diet_shopping_categories;
create policy "delete own diet shopping categories" on public.diet_shopping_categories
  for delete to authenticated
  using ((select auth.uid()) = user_id);


create table if not exists public.diet_shopping_state (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  item_key text not null,
  checked boolean not null default true,
  primary key (user_id, item_key)
);

alter table public.diet_shopping_state enable row level security;

drop policy if exists "select own diet shopping state" on public.diet_shopping_state;
create policy "select own diet shopping state" on public.diet_shopping_state
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "insert own diet shopping state" on public.diet_shopping_state;
create policy "insert own diet shopping state" on public.diet_shopping_state
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "update own diet shopping state" on public.diet_shopping_state;
create policy "update own diet shopping state" on public.diet_shopping_state
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "delete own diet shopping state" on public.diet_shopping_state;
create policy "delete own diet shopping state" on public.diet_shopping_state
  for delete to authenticated
  using ((select auth.uid()) = user_id);


create table if not exists public.diet_day_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date date not null,
  picks jsonb not null default '{}'::jsonb,
  supplements jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);

create index if not exists diet_day_logs_user_id_date_idx on public.diet_day_logs (user_id, date);

alter table public.diet_day_logs enable row level security;

drop policy if exists "select own diet day logs" on public.diet_day_logs;
create policy "select own diet day logs" on public.diet_day_logs
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "insert own diet day logs" on public.diet_day_logs;
create policy "insert own diet day logs" on public.diet_day_logs
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "update own diet day logs" on public.diet_day_logs;
create policy "update own diet day logs" on public.diet_day_logs
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "delete own diet day logs" on public.diet_day_logs;
create policy "delete own diet day logs" on public.diet_day_logs
  for delete to authenticated
  using ((select auth.uid()) = user_id);


create table if not exists public.diet_measurements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date date not null default current_date,
  weight numeric,
  waist numeric,
  hip numeric,
  arm numeric,
  thigh numeric,
  created_at timestamptz not null default now()
);

create index if not exists diet_measurements_user_id_date_idx on public.diet_measurements (user_id, date);

alter table public.diet_measurements enable row level security;

drop policy if exists "select own diet measurements" on public.diet_measurements;
create policy "select own diet measurements" on public.diet_measurements
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "insert own diet measurements" on public.diet_measurements;
create policy "insert own diet measurements" on public.diet_measurements
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "update own diet measurements" on public.diet_measurements;
create policy "update own diet measurements" on public.diet_measurements
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "delete own diet measurements" on public.diet_measurements;
create policy "delete own diet measurements" on public.diet_measurements
  for delete to authenticated
  using ((select auth.uid()) = user_id);
