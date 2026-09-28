-- Skin Care module (ported from the standalone SkinLog app).

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  brand text not null default '',
  category text not null check (category in ('limpeza','tratamento','hidratacao','protecao')),
  stock int not null default 100 check (stock between 0 and 100),
  opened_at date not null,
  shelf_life_days int not null,
  notes text not null default '',
  status text not null default 'active' check (status in ('active','paused','finished')),
  photo_url text,
  created_at timestamptz not null default now()
);
create index if not exists products_user_id_idx on public.products (user_id);

create table if not exists public.wishlist_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  brand text not null default '',
  category text not null check (category in ('limpeza','tratamento','hidratacao','protecao')),
  price text not null default '',
  link text not null default '',
  priority text not null check (priority in ('proxima','testar','algumdia')),
  purchased boolean not null default false,
  product_id uuid references public.products (id) on delete set null,
  photo_url text,
  created_at timestamptz not null default now()
);
create index if not exists wishlist_items_user_id_idx on public.wishlist_items (user_id);

create table if not exists public.routines (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  window_label text not null,
  freq_mode text not null check (freq_mode in ('todos','dias','intervalo')),
  days int[] not null default '{}',
  interval int not null default 1,
  step_order text[] not null default '{}',
  status text not null default 'active' check (status in ('active','archived')),
  sort_order int not null default 0
);
create index if not exists routines_user_id_idx on public.routines (user_id);

create table if not exists public.routine_steps (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  routine_id text references public.routines (id) on delete cascade,
  product_id uuid references public.products (id) on delete cascade,
  instruction text not null default ''
);
create index if not exists routine_steps_user_id_idx on public.routine_steps (user_id);

create table if not exists public.checkins (
  date date not null,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  note text not null default '',
  tags text[] not null default '{}',
  primary key (user_id, date)
);

create table if not exists public.checkin_items (
  date date not null,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  step_id text not null,
  done boolean not null default false,
  primary key (user_id, date, step_id)
);

create table if not exists public.skin_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date date not null,
  note text not null default '',
  tags text[] not null default '{}',
  product_ids_in_use uuid[] not null default '{}',
  routine_ids_in_use text[] not null default '{}',
  photo_url text,
  created_at timestamptz not null default now()
);
create index if not exists skin_logs_user_id_idx on public.skin_logs (user_id);

do $$
declare
  t text;
begin
  for t in select unnest(array['products','wishlist_items','routines','routine_steps','checkins','checkin_items','skin_logs'])
  loop
    execute format('alter table public.%I enable row level security', t);

    execute format('drop policy if exists "select own %s" on public.%I', t, t);
    execute format(
      'create policy "select own %s" on public.%I for select to authenticated using ((select auth.uid()) = user_id)',
      t, t
    );

    execute format('drop policy if exists "insert own %s" on public.%I', t, t);
    execute format(
      'create policy "insert own %s" on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)',
      t, t
    );

    execute format('drop policy if exists "update own %s" on public.%I', t, t);
    execute format(
      'create policy "update own %s" on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)',
      t, t
    );

    execute format('drop policy if exists "delete own %s" on public.%I', t, t);
    execute format(
      'create policy "delete own %s" on public.%I for delete to authenticated using ((select auth.uid()) = user_id)',
      t, t
    );
  end loop;
end $$;
