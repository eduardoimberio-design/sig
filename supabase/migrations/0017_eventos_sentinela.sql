-- =========================================================
-- SIG - Migration 0017: Eventos do sistema + Sentinela
--
-- Até aqui, quando algo quebrava para um cliente, não ficava
-- rastro em lugar nenhum — o problema do XML só apareceu
-- porque o cliente reclamou. Esta tabela é a memória de
-- falhas do sistema.
--
-- Regra: registrar evento NUNCA pode derrubar a operação. Se
-- a gravação falhar, a função que chamou segue em frente.
-- =========================================================

create table eventos_sistema (
  id uuid primary key default gen_random_uuid(),

  -- de qual empresa era a operação (null quando não dá para saber,
  -- por exemplo visitante anônimo falando com o João)
  empresa_id uuid references empresas(id) on delete set null,

  -- onde aconteceu: 'joao', 'anexos', 'consultor', 'marketing',
  -- 'documentos', 'pagamento', 'conselheiro'
  origem text not null,

  -- o que aconteceu: 'ia_falhou', 'leitura_falhou', 'pagamento_falhou',
  -- 'limite_atingido', 'erro'
  tipo text not null,

  severidade text not null default 'erro'
    check (severidade in ('aviso', 'erro', 'critico')),

  mensagem text not null,

  -- contexto técnico livre (nunca dado sensível do cliente)
  detalhe jsonb,

  created_at timestamptz not null default now()
);

create index idx_eventos_sistema_data
  on eventos_sistema(created_at desc);

create index idx_eventos_sistema_origem
  on eventos_sistema(origem, created_at desc);

alter table eventos_sistema enable row level security;

-- Só o admin do SIG lê. Cliente nunca vê nada daqui — inclusive
-- porque um evento pode citar outra empresa.
create policy "eventos_sistema_admin" on eventos_sistema
  for all using (is_admin_sig()) with check (is_admin_sig());

-- -------------------------------------------------
-- RESUMOS DO SENTINELA
-- Um por dia, gerado de manhã sobre as últimas 24 horas.
-- -------------------------------------------------
create table resumos_sentinela (
  id uuid primary key default gen_random_uuid(),

  referencia date not null unique,        -- dia analisado
  total_eventos integer not null default 0,
  total_criticos integer not null default 0,

  -- números contados em SQL; a IA só escreve sobre eles
  contagem jsonb,

  resumo text not null,
  lido boolean not null default false,

  created_at timestamptz not null default now()
);

create index idx_resumos_sentinela_data
  on resumos_sentinela(referencia desc);

alter table resumos_sentinela enable row level security;

create policy "resumos_sentinela_admin" on resumos_sentinela
  for all using (is_admin_sig()) with check (is_admin_sig());

-- -------------------------------------------------
-- Contagem de eventos por origem e tipo num período.
-- Existe para o Sentinela nunca precisar pedir número à IA:
-- o cálculo é do banco, a IA só interpreta.
-- -------------------------------------------------
create or replace function sentinela_contar(
  p_inicio timestamptz,
  p_fim timestamptz
)
returns table (
  origem text,
  tipo text,
  severidade text,
  ocorrencias bigint,
  empresas_afetadas bigint,
  exemplo text,
  ultima_em timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    e.origem,
    e.tipo,
    e.severidade,
    count(*)                                   as ocorrencias,
    count(distinct e.empresa_id)               as empresas_afetadas,
    (array_agg(e.mensagem order by e.created_at desc))[1] as exemplo,
    max(e.created_at)                          as ultima_em
  from eventos_sistema e
  where e.created_at >= p_inicio
    and e.created_at < p_fim
  group by e.origem, e.tipo, e.severidade
  order by count(*) desc;
$$;

revoke execute on function sentinela_contar(timestamptz, timestamptz) from public;
