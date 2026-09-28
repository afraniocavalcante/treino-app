-- Horário real por refeição/suplemento — necessário pra linha do tempo consolidada
-- da tela Hoje (Personal OS). orderIndex por si só não posiciona nada no relógio.

alter table public.diet_meals add column if not exists scheduled_time time;
alter table public.diet_supplements add column if not exists scheduled_time time;

-- Backfill dos planos existentes, pelas chaves fixas dos 5 slots de refeição
-- (ver seedDefaultDietMeals em src/lib/dietData.ts — essas chaves são hard-wired).
update public.diet_meals set scheduled_time = '07:30' where key = 'cafe' and scheduled_time is null;
update public.diet_meals set scheduled_time = '12:30' where key = 'almoco' and scheduled_time is null;
update public.diet_meals set scheduled_time = '16:00' where key = 'lanche' and scheduled_time is null;
update public.diet_meals set scheduled_time = '20:30' where key = 'jantar' and scheduled_time is null;
update public.diet_meals set scheduled_time = '21:00' where key = 'sobremesa' and scheduled_time is null;
-- qualquer chave de refeição fora dessas 5 (não deveria existir, mas por segurança)
update public.diet_meals set scheduled_time = '12:00' where scheduled_time is null;

-- Suplementos: heurística a partir do texto livre já cadastrado em "timing",
-- com um horário genérico de manhã como último recurso — editável depois.
update public.diet_supplements set scheduled_time = '08:00'
  where scheduled_time is null and timing ilike any (array['%manh%', '%café%', '%acord%']);
update public.diet_supplements set scheduled_time = '13:00'
  where scheduled_time is null and timing ilike any (array['%almoço%', '%almoco%']);
update public.diet_supplements set scheduled_time = '17:00'
  where scheduled_time is null and timing ilike any (array['%treino%', '%pré%', '%pre-treino%']);
update public.diet_supplements set scheduled_time = '22:00'
  where scheduled_time is null and timing ilike any (array['%noite%', '%dormir%', '%deitar%']);
update public.diet_supplements set scheduled_time = '08:00' where scheduled_time is null;
