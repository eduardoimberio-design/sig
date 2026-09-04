-- =========================================================
-- SIG - Migration 0026: Nota de compra vira despesa + série mensal
--
-- Problema que isto corrige: ao confirmar uma nota, o sistema
-- somava o estoque e atualizava o custo do insumo, mas nunca
-- registrava o gasto. Resultado: CMV do DRE menor que a
-- realidade, fornecedor ausente do Pareto e painel de
-- desempenho otimista sem que ninguém percebesse.
-- =========================================================

-- Liga a conta a pagar ao documento que a originou. Serve para
-- não lançar duas vezes e para o cliente saber de onde veio.
alter table contas_pagar
  add column if not exists documento_id uuid
    references documentos_importados(id) on delete set null;

-- Um documento gera no máximo uma conta. Se a confirmação for
-- repetida, o banco recusa em vez de duplicar o CMV.
create unique index if not exists idx_contas_pagar_documento
  on contas_pagar(documento_id)
  where documento_id is not null;

-- -------------------------------------------------
-- SÉRIE MENSAL — evolução de CMV e mão de obra
--
-- Um único retorno com os meses, para acompanhar tendência sem
-- disparar uma consulta por mês.
-- -------------------------------------------------
create or replace function serie_mensal(
  p_empresa_id uuid,
  p_meses integer default 6
)
returns table (
  mes date,
  receita numeric,
  cmv numeric,
  pessoal numeric,
  cmv_percentual numeric,
  pessoal_percentual numeric,
  prime_cost_percentual numeric
)
language sql
security definer
set search_path = public
as $$
  with meses as (
    select date_trunc('month', d)::date as mes
    from generate_series(
      date_trunc('month', now()) - ((p_meses - 1) || ' months')::interval,
      date_trunc('month', now()),
      '1 month'
    ) d
  ),
  vendas as (
    select date_trunc('month', v.data)::date as mes,
           sum(v.faturamento) as receita
    from vendas_diarias v
    where v.empresa_id = p_empresa_id
    group by 1
  ),
  contas as (
    select date_trunc('month', c.vencimento)::date as mes,
           sum(c.valor) filter (where c.grupo_dre = 'cmv') as cmv,
           sum(c.valor) filter (where c.grupo_dre = 'pessoal') as pessoal
    from contas_pagar c
    where c.empresa_id = p_empresa_id
    group by 1
  )
  select
    m.mes,
    coalesce(v.receita, 0),
    coalesce(c.cmv, 0),
    coalesce(c.pessoal, 0),
    case when coalesce(v.receita, 0) > 0
         then round(coalesce(c.cmv, 0) * 100 / v.receita, 1) else 0 end,
    case when coalesce(v.receita, 0) > 0
         then round(coalesce(c.pessoal, 0) * 100 / v.receita, 1) else 0 end,
    case when coalesce(v.receita, 0) > 0
         then round((coalesce(c.cmv, 0) + coalesce(c.pessoal, 0)) * 100 / v.receita, 1)
         else 0 end
  from meses m
  left join vendas v on v.mes = m.mes
  left join contas c on c.mes = m.mes
  order by m.mes;
$$;
