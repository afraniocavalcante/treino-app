-- Allow a program to be scheduled ahead of time, taking over automatically
-- once the currently active program's training days run out.

alter table public.programs drop constraint if exists programs_status_check;
alter table public.programs add constraint programs_status_check
  check (status in ('active', 'scheduled', 'completed'));
