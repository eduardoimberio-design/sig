-- =========================================================
-- SIG - Migration 0028 (v2): Leads de conversa param de se perder
--
-- Versão defensiva: confere se cada coluna existe antes de alterar.
-- A primeira versão falhou porque a 0019 já tinha removido
-- cmv_faixa e dor_principal — o banco real não bate com a 0018.
--
-- Pode rodar quantas vezes quiser: tudo é idempotente.
-- =========================================================

-- 1. Coluna de agendamento (a que a 0027 criaria).
alter table public.leads_diagnostico
  add column if not exists agendamento_solicitado text;

-- 2. Libera qualquer campo antigo do formulário que ainda seja
--    obrigatório — mas só se a coluna existir.
do $$
declare
  coluna text;
begin
  foreach coluna in array array[
    'tipo_negocio', 'cmv_faixa', 'dor_principal',
    'causa_raiz', 'acao_recomendada', 'whatsapp'
  ]
  loop
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name = 'leads_diagnostico'
        and column_name = coluna
        and is_nullable = 'NO'
    ) then
      execute format(
        'alter table public.leads_diagnostico alter column %I drop not null',
        coluna
      );
      raise notice 'Liberado: %', coluna;
    end if;
  end loop;
end $$;

-- 3. Lista de tipos passa a aceitar "Delivery / dark kitchen",
--    que o extrator do João devolve. Só se a coluna existir.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'leads_diagnostico'
      and column_name = 'tipo_negocio'
  ) then
    alter table public.leads_diagnostico
      drop constraint if exists leads_diagnostico_tipo_negocio_check;

    alter table public.leads_diagnostico
      add constraint leads_diagnostico_tipo_negocio_check
      check (tipo_negocio in (
        'Bar',
        'Restaurante',
        'Café / Cafeteria',
        'Delivery / dark kitchen',
        'Outro'
      ));
  end if;
end $$;

-- 4. Atualiza o cache do Supabase — é o que causava o erro
--    "Could not find the column ... in the schema cache".
notify pgrst, 'reload schema';
