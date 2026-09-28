-- Viagens/Voos module.

create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  city text not null,
  name text not null,
  start_date date not null,
  end_date date not null,
  created_at timestamptz not null default now()
);

create index if not exists trips_user_id_start_date_idx
  on public.trips (user_id, start_date);

alter table public.trips enable row level security;

drop policy if exists "select own trips" on public.trips;
create policy "select own trips" on public.trips
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "insert own trips" on public.trips;
create policy "insert own trips" on public.trips
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "update own trips" on public.trips;
create policy "update own trips" on public.trips
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "delete own trips" on public.trips;
create policy "delete own trips" on public.trips
  for delete to authenticated
  using ((select auth.uid()) = user_id);

create table if not exists public.flights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  trip_id uuid not null references public.trips (id) on delete cascade,
  carrier text not null,
  flight_number text not null,
  origin_iata text not null,
  origin_city text not null,
  origin_terminal text,
  dest_iata text not null,
  dest_city text not null,
  dest_terminal text,
  departure_at timestamptz not null,
  arrival_at timestamptz not null,
  pnr text,
  seat text,
  boarding_group text,
  gate text,
  bags_cabin_kg numeric,
  bags_checked_kg numeric,
  checkin_opens_at timestamptz,
  checkin_done boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists flights_user_id_departure_at_idx
  on public.flights (user_id, departure_at);
create index if not exists flights_trip_id_idx
  on public.flights (trip_id);

alter table public.flights enable row level security;

drop policy if exists "select own flights" on public.flights;
create policy "select own flights" on public.flights
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "insert own flights" on public.flights;
create policy "insert own flights" on public.flights
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "update own flights" on public.flights;
create policy "update own flights" on public.flights
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "delete own flights" on public.flights;
create policy "delete own flights" on public.flights
  for delete to authenticated
  using ((select auth.uid()) = user_id);

create table if not exists public.checklist_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  trip_id uuid not null references public.trips (id) on delete cascade,
  flight_id uuid references public.flights (id) on delete cascade,
  text text not null,
  moment text not null check (moment in ('dias-antes', 'vespera', 'dia')),
  done boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists checklist_items_trip_id_idx
  on public.checklist_items (trip_id);

alter table public.checklist_items enable row level security;

drop policy if exists "select own checklist items" on public.checklist_items;
create policy "select own checklist items" on public.checklist_items
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "insert own checklist items" on public.checklist_items;
create policy "insert own checklist items" on public.checklist_items
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "update own checklist items" on public.checklist_items;
create policy "update own checklist items" on public.checklist_items
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "delete own checklist items" on public.checklist_items;
create policy "delete own checklist items" on public.checklist_items
  for delete to authenticated
  using ((select auth.uid()) = user_id);
