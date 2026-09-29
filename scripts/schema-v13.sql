-- Aviso de "fazer a mala" — uma tarefa por viagem, não diária: aparece na
-- lista (Hoje + widget) 3 dias antes do voo mais próximo da viagem e
-- persiste até ser marcada ou a viagem passar.
alter table public.trips add column if not exists mala_feita boolean not null default false;
