-- Exercise demonstration GIFs

alter table public.exercise_library add column if not exists gif_url text;

insert into storage.buckets (id, name, public)
values ('exercise-gifs', 'exercise-gifs', true)
on conflict (id) do nothing;

drop policy if exists "public read exercise gifs" on storage.objects;
create policy "public read exercise gifs" on storage.objects
  for select to public using (bucket_id = 'exercise-gifs');

drop policy if exists "authenticated upload exercise gifs" on storage.objects;
create policy "authenticated upload exercise gifs" on storage.objects
  for insert to authenticated with check (bucket_id = 'exercise-gifs');

drop policy if exists "authenticated update exercise gifs" on storage.objects;
create policy "authenticated update exercise gifs" on storage.objects
  for update to authenticated using (bucket_id = 'exercise-gifs') with check (bucket_id = 'exercise-gifs');

drop policy if exists "authenticated delete exercise gifs" on storage.objects;
create policy "authenticated delete exercise gifs" on storage.objects
  for delete to authenticated using (bucket_id = 'exercise-gifs');
