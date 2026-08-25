-- 0020_leads_diagnostico_v3.sql
-- Substitui perguntas qualitativas (tempo de operação, consciência de CMV, decisão por intuição)
-- por dados financeiros reais do negócio, que permitem cálculo de indicadores de verdade.
-- AJUSTE: confira se 0019 é mesmo a última migration aplicada antes de rodar esta.

alter table public.leads_diagnostico
  drop column if exists tempo_operacao,
  drop column if exists consciencia_cmv,
  drop column if exists decisao_intuicao;

alter table public.leads_diagnostico
  add column if not exists faturamento_mensal numeric check (faturamento_mensal > 0),
  add column if not exists compras_mensal numeric check (compras_mensal >= 0),
  add column if not exists custo_funcionarios_mensal numeric check (custo_funcionarios_mensal >= 0),
  add column if not exists cmv_percentual numeric,
  add column if not exists custo_pessoal_percentual numeric,
  add column if not exists prime_cost_percentual numeric,
  add column if not exists leitura_financeira text;

comment on column public.leads_diagnostico.faturamento_mensal is
  'Faturamento mensal aproximado informado pelo lead, em R$.';
comment on column public.leads_diagnostico.compras_mensal is
  'Gasto mensal aproximado com compras/insumos (mercadoria), em R$.';
comment on column public.leads_diagnostico.custo_funcionarios_mensal is
  'Gasto mensal aproximado com folha de pagamento (salários + encargos), em R$.';
comment on column public.leads_diagnostico.cmv_percentual is
  'CMV calculado = compras_mensal / faturamento_mensal * 100.';
comment on column public.leads_diagnostico.custo_pessoal_percentual is
  'Custo de pessoal calculado = custo_funcionarios_mensal / faturamento_mensal * 100.';
comment on column public.leads_diagnostico.prime_cost_percentual is
  'Prime Cost calculado = cmv_percentual + custo_pessoal_percentual.';
comment on column public.leads_diagnostico.leitura_financeira is
  'Parágrafo com a leitura numérica dos indicadores comparados às faixas de referência do setor.';
