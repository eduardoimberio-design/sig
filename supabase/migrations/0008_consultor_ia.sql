-- =========================================================
-- SIG - Migration 0008: Consultor IA
--
-- O Consultor não é um agente à parte com dados próprios — ele lê
-- o que Financeiro (0004) e Estoque (0005) já calculam, e produz
-- interpretação. Por isso esta migration é pequena: só guarda o
-- histórico de relatórios e o rastreamento de recomendações.
-- =========================================================

create type status_recomendacao as enum ('pendente', 'aplicada', 'descartada');
create type categoria_recomendacao as enum (
  'precificacao', 'estoque', 'financeiro', 'concentracao_gasto'
);

-- -------------------------------------------------
-- RELATÓRIOS GERADOS
-- Guarda o texto final (já em português, tom de consultoria) e os
-- dados estruturados que o geraram — para auditoria e para não
-- precisar reprocessar se o cliente quiser reler.
-- -------------------------------------------------
create table relatorios_consultor (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,

  periodo_inicio date not null,
  periodo_fim date not null,

  conteudo text not null,          -- relatório em markdown, pronto pra leitura
  dados_estruturados jsonb,        -- o que alimentou a IA — para auditoria

  gerado_por text not null default 'manual', -- 'manual' | 'automatico'
  created_at timestamptz not null default now()
);

create index idx_relatorios_empresa on relatorios_consultor(empresa_id, created_at desc);

alter table relatorios_consultor enable row level security;
create policy "relatorios_all" on relatorios_consultor
  for all using (empresa_id in (select auth_empresa_ids()))
  with check (empresa_id in (select auth_empresa_ids()));

-- -------------------------------------------------
-- RECOMENDAÇÕES
-- Extraídas do relatório como itens acionáveis independentes,
-- para o cliente marcar o que já resolveu — sem isso, o relatório
-- é só leitura, não ferramenta de trabalho.
-- -------------------------------------------------
create table recomendacoes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  relatorio_id uuid references relatorios_consultor(id) on delete cascade,

  categoria categoria_recomendacao not null,
  titulo text not null,
  descricao text not null,
  impacto_estimado text,           -- texto livre: "R$ 340/mês de margem"

  status status_recomendacao not null default 'pendente',

  created_at timestamptz not null default now(),
  resolvida_em timestamptz
);

create index idx_recomendacoes_empresa on recomendacoes(empresa_id, status);

alter table recomendacoes enable row level security;
create policy "recomendacoes_all" on recomendacoes
  for all using (empresa_id in (select auth_empresa_ids()))
  with check (empresa_id in (select auth_empresa_ids()));

-- -------------------------------------------------
-- CONFIGURAÇÃO
-- Frequência é preparada desde já, mas o disparo automático
-- (cron) é Fase 2 — precisa de um scheduler externo ou Supabase
-- Edge Function agendada, fora do escopo deste MVP.
-- -------------------------------------------------
create table config_consultor (
  empresa_id uuid primary key references empresas(id) on delete cascade,
  frequencia text not null default 'semanal', -- 'semanal' | 'quinzenal' | 'mensal'
  meta_cmv_alerta numeric(5,2) not null default 35.00,
  updated_at timestamptz not null default now()
);

alter table config_consultor enable row level security;
create policy "config_consultor_all" on config_consultor
  for all using (empresa_id in (select auth_empresa_ids()))
  with check (empresa_id in (select auth_empresa_ids()));

create trigger trg_config_consultor_updated before update on config_consultor
  for each row execute function set_updated_at();

create or replace function criar_config_consultor()
returns trigger language plpgsql security definer as $$
begin
  insert into config_consultor (empresa_id) values (new.id)
  on conflict do nothing;
  return new;
end;
$$;

create trigger trg_empresa_config_consultor after insert on empresas
  for each row execute function criar_config_consultor();

insert into config_consultor (empresa_id)
select id from empresas on conflict do nothing;

create or replace function marcar_recomendacao(
  p_id uuid, p_status status_recomendacao
)
returns void
language sql
security definer
as $$
  update recomendacoes
  set status = p_status,
      resolvida_em = case when p_status <> 'pendente' then now() else null end
  where id = p_id;
$$;
