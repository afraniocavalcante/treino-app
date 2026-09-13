-- Diet plan lifecycle: treat diet plans like workout programs (active / scheduled /
-- completed), nameable (PA1, PA2...), with an explicit calendar validity window
-- instead of a plan just being whichever row was created most recently.

alter table public.diet_plans add column if not exists status text not null default 'active';
alter table public.diet_plans add column if not exists start_date date;
alter table public.diet_plans add column if not exists end_date date;

alter table public.diet_plans drop constraint if exists diet_plans_status_check;
alter table public.diet_plans add constraint diet_plans_status_check
  check (status in ('active', 'scheduled', 'completed'));

-- Backfill: whatever plan exists today becomes the active one, dated from its creation.
update public.diet_plans set start_date = created_at::date where start_date is null;
