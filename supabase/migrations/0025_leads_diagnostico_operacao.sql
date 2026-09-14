-- 0025_leads_diagnostico_operacao.sql
-- O João passa a colher também o retrato da operação, não só os números financeiros.
-- Isso qualifica muito melhor o lead: um delivery de 3 pessoas e 12 pratos é um caso
-- completamente diferente de um restaurante de 20 pessoas e 60 pratos, mesmo que os
-- percentuais de CMV sejam parecidos.
--
-- AJUSTE: confira se 0024 é mesmo a última migration aplicada antes de rodar esta.

alter table public.leads_diagnostico
  add column if not exists numero_funcionarios integer,
  add column if not exists itens_cardapio integer,
  add column if not exists volume_vendas_mes integer,
  add column if not exists descricao_operacao text,
  add column if not exists interesse_final text
    check (interesse_final in (
      'videochamada_agendada',
      'aceitou_contato_consultor',
      'quer_contratar',
      'sem_interesse',
      'indefinido'
    ));

comment on column public.leads_diagnostico.numero_funcionarios is
  'Quantas pessoas trabalham no negócio, incluindo o dono.';
comment on column public.leads_diagnostico.itens_cardapio is
  'Quantos itens o cardápio tem — cardápio inchado é causa frequente de CMV alto.';
comment on column public.leads_diagnostico.volume_vendas_mes is
  'Número aproximado de pedidos/atendimentos por mês. Com o faturamento, permite calcular ticket médio.';
comment on column public.leads_diagnostico.descricao_operacao is
  'Como o lead descreve a própria operação, nas palavras dele. Contexto que número nenhum captura.';
comment on column public.leads_diagnostico.interesse_final is
  'Como a conversa terminou — serve para priorizar o follow-up.';
