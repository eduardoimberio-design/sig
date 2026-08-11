-- =========================================================
-- SIG - Migration 0004: Agente Financeiro
--
-- Acrescenta o que faltava para produzir DRE, fluxo de caixa,
-- ticket médio e detecção automática de contas vencidas.
-- =========================================================

-- -------------------------------------------------
-- CLASSIFICAÇÃO CONTÁBIL
-- Cada despesa precisa saber ONDE entra no DRE.
-- Sem isso o relatório vira uma lista de gastos, não um DRE.
-- -------------------------------------------------
create type grupo_dre as enum (
  'impostos',            -- impostos sobre vendas
  'cmv',                 -- custo da mercadoria vendida (insumos)
  'pessoal',             -- folha, encargos, pró-labore de operação
  'despesa_fixa',        -- aluguel, contador, software, seguro
  'despesa_variavel',    -- energia, gás, embalagem, taxa de delivery
  'despesa_financeira',  -- juros, tarifas bancárias, taxa de cartão
  'investimento',        -- equipamentos, reforma (não entra no DRE)
  'retirada'             -- distribuição de lucro (não entra no DRE)
);

alter table contas_pagar
  add column grupo_dre grupo_dre not null default 'despesa_variavel',
  add column recorrente boolean not null default false;

-- -------------------------------------------------
-- VENDAS DIÁRIAS
-- Base da receita. Sem isso não existe DRE nem ticket médio.
-- Lançamento manual no MVP; integração com PDV é fase futura.
-- -------------------------------------------------
create table vendas_diarias (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  data date not null,
  faturamento numeric(12,2) not null default 0,
  num_atendimentos integer not null default 0,   -- para ticket médio
  canal text,                                    -- salão, delivery, balcão
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (empresa_id, data, canal)
);

create index idx_vendas_empresa_data on vendas_diarias(empresa_id, data desc);

alter table vendas_diarias enable row level security;

create policy "vendas_all" on vendas_diarias
  for all using (empresa_id in (select auth_empresa_ids()))
  with check (empresa_id in (select auth_empresa_ids()));

create trigger trg_vendas_updated before update on vendas_diarias
  for each row execute function set_updated_at();

-- -------------------------------------------------
-- CONFIGURAÇÃO FINANCEIRA POR EMPRESA
-- -------------------------------------------------
create table config_financeiro (
  empresa_id uuid primary key references empresas(id) on delete cascade,
  dias_tolerancia_vencimento integer not null default 3,
  meta_cmv_percentual numeric(5,2) not null default 30.00,
  aliquota_imposto_percentual numeric(5,2) not null default 6.00,
  saldo_inicial_caixa numeric(12,2) not null default 0,
  updated_at timestamptz not null default now()
);

alter table config_financeiro enable row level security;

create policy "config_fin_all" on config_financeiro
  for all using (empresa_id in (select auth_empresa_ids()))
  with check (empresa_id in (select auth_empresa_ids()));

create trigger trg_config_fin_updated before update on config_financeiro
  for each row execute function set_updated_at();

-- Toda empresa nova ganha configuração padrão automaticamente
create or replace function criar_config_financeiro()
returns trigger language plpgsql security definer as $$
begin
  insert into config_financeiro (empresa_id) values (new.id)
  on conflict do nothing;
  return new;
end;
$$;

create trigger trg_empresa_config_fin after insert on empresas
  for each row execute function criar_config_financeiro();

-- Cria configuração para empresas que já existiam
insert into config_financeiro (empresa_id)
select id from empresas on conflict do nothing;

-- -------------------------------------------------
-- MARCAÇÃO AUTOMÁTICA DE ATRASO
-- Chamada a cada carregamento do painel financeiro.
-- Barata: só toca linhas que realmente mudaram de status.
-- -------------------------------------------------
create or replace function atualizar_status_vencidos(p_empresa_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_tolerancia integer;
begin
  select dias_tolerancia_vencimento into v_tolerancia
  from config_financeiro where empresa_id = p_empresa_id;

  v_tolerancia := coalesce(v_tolerancia, 3);

  update contas_pagar
    set status = 'atrasado'
  where empresa_id = p_empresa_id
    and status = 'pendente'
    and vencimento < current_date - v_tolerancia;

  update contas_receber
    set status = 'atrasado'
  where empresa_id = p_empresa_id
    and status = 'pendente'
    and vencimento < current_date - v_tolerancia;
end;
$$;

-- -------------------------------------------------
-- DRE DO PERÍODO
-- Regime de caixa (considera o que foi efetivamente pago).
-- Investimento e retirada ficam de fora do resultado —
-- comprar um forno não é despesa do mês, é investimento.
-- -------------------------------------------------
create or replace function dre_periodo(
  p_empresa_id uuid,
  p_inicio date,
  p_fim date
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_receita numeric := 0;
  v_atendimentos integer := 0;
  v_impostos numeric := 0;
  v_cmv numeric := 0;
  v_pessoal numeric := 0;
  v_fixa numeric := 0;
  v_variavel numeric := 0;
  v_financeira numeric := 0;
  v_investimento numeric := 0;
  v_aliquota numeric := 6;
begin
  -- Segurança: a função é security definer, então precisa validar
  -- explicitamente que o usuário pertence à empresa consultada.
  if not exists (
    select 1 from usuarios_empresa
    where auth_user_id = auth.uid() and empresa_id = p_empresa_id
  ) then
    return jsonb_build_object('erro', 'Acesso negado.');
  end if;

  select coalesce(sum(faturamento), 0), coalesce(sum(num_atendimentos), 0)
    into v_receita, v_atendimentos
  from vendas_diarias
  where empresa_id = p_empresa_id and data between p_inicio and p_fim;

  select coalesce(aliquota_imposto_percentual, 6) into v_aliquota
  from config_financeiro where empresa_id = p_empresa_id;

  select
    coalesce(sum(valor) filter (where grupo_dre = 'impostos'), 0),
    coalesce(sum(valor) filter (where grupo_dre = 'cmv'), 0),
    coalesce(sum(valor) filter (where grupo_dre = 'pessoal'), 0),
    coalesce(sum(valor) filter (where grupo_dre = 'despesa_fixa'), 0),
    coalesce(sum(valor) filter (where grupo_dre = 'despesa_variavel'), 0),
    coalesce(sum(valor) filter (where grupo_dre = 'despesa_financeira'), 0),
    coalesce(sum(valor) filter (where grupo_dre = 'investimento'), 0)
  into v_impostos, v_cmv, v_pessoal, v_fixa, v_variavel, v_financeira, v_investimento
  from contas_pagar
  where empresa_id = p_empresa_id
    and status = 'pago'
    and coalesce(data_pagamento::date, vencimento) between p_inicio and p_fim;

  -- Se não houve imposto lançado como conta, estima pela alíquota
  if v_impostos = 0 and v_receita > 0 then
    v_impostos := round(v_receita * v_aliquota / 100, 2);
  end if;

  return jsonb_build_object(
    'receita_bruta', v_receita,
    'num_atendimentos', v_atendimentos,
    'ticket_medio', case when v_atendimentos > 0
                         then round(v_receita / v_atendimentos, 2) else 0 end,
    'impostos', v_impostos,
    'receita_liquida', v_receita - v_impostos,
    'cmv', v_cmv,
    'cmv_percentual', case when v_receita > 0
                           then round(v_cmv * 100 / v_receita, 2) else 0 end,
    'lucro_bruto', v_receita - v_impostos - v_cmv,
    'pessoal', v_pessoal,
    'despesa_fixa', v_fixa,
    'despesa_variavel', v_variavel,
    'total_despesas', v_pessoal + v_fixa + v_variavel,
    'resultado_operacional', v_receita - v_impostos - v_cmv - v_pessoal - v_fixa - v_variavel,
    'despesa_financeira', v_financeira,
    'lucro_liquido', v_receita - v_impostos - v_cmv - v_pessoal - v_fixa - v_variavel - v_financeira,
    'margem_liquida', case when v_receita > 0
      then round((v_receita - v_impostos - v_cmv - v_pessoal - v_fixa - v_variavel - v_financeira) * 100 / v_receita, 2)
      else 0 end,
    'investimento', v_investimento
  );
end;
$$;

-- -------------------------------------------------
-- FLUXO DE CAIXA PROJETADO
-- Junta o que já entrou/saiu com o que está previsto.
-- -------------------------------------------------
create or replace function fluxo_caixa(
  p_empresa_id uuid,
  p_inicio date,
  p_fim date
)
returns table (
  dia date,
  entradas numeric,
  saidas numeric,
  saldo_dia numeric,
  saldo_acumulado numeric
)
language sql
security definer
as $$
  with dias as (
    select generate_series(p_inicio, p_fim, '1 day')::date as dia
  ),
  mov as (
    select
      d.dia,
      coalesce((
        select sum(v.faturamento) from vendas_diarias v
        where v.empresa_id = p_empresa_id and v.data = d.dia
      ), 0)
      + coalesce((
        select sum(r.valor) from contas_receber r
        where r.empresa_id = p_empresa_id
          and coalesce(r.data_recebimento::date, r.vencimento) = d.dia
      ), 0) as entradas,
      coalesce((
        select sum(p.valor) from contas_pagar p
        where p.empresa_id = p_empresa_id
          and p.status <> 'cancelado'
          and coalesce(p.data_pagamento::date, p.vencimento) = d.dia
      ), 0) as saidas
    from dias d
  )
  select
    m.dia,
    m.entradas,
    m.saidas,
    m.entradas - m.saidas as saldo_dia,
    sum(m.entradas - m.saidas) over (order by m.dia) as saldo_acumulado
  from mov m
  where exists (
    select 1 from usuarios_empresa
    where auth_user_id = auth.uid() and empresa_id = p_empresa_id
  )
  order by m.dia;
$$;

-- -------------------------------------------------
-- ALERTAS: contas a vencer nos próximos dias
-- -------------------------------------------------
create or replace view alertas_financeiros as
select
  cp.empresa_id,
  'pagar' as tipo,
  cp.id,
  cp.descricao,
  cp.valor,
  cp.vencimento,
  cp.status,
  (cp.vencimento - current_date) as dias_para_vencer
from contas_pagar cp
where cp.status in ('pendente', 'atrasado')
  and cp.vencimento <= current_date + 7
union all
select
  cr.empresa_id,
  'receber' as tipo,
  cr.id,
  cr.descricao,
  cr.valor,
  cr.vencimento,
  cr.status,
  (cr.vencimento - current_date) as dias_para_vencer
from contas_receber cr
where cr.status in ('pendente', 'atrasado')
  and cr.vencimento <= current_date + 7;

alter view alertas_financeiros set (security_invoker = true);
