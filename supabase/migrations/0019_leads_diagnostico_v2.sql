-- 0019_leads_diagnostico_v2.sql
-- Atualiza leads_diagnostico pro questionário de 7 perguntas (mais direto, sem linguagem de coach)
-- AJUSTE: confira se 0018 é mesmo a última migration aplicada antes de rodar esta.

alter table public.leads_diagnostico
  drop column if exists cmv_faixa,
  drop column if exists dor_principal;

alter table public.leads_diagnostico
  add column if not exists tempo_operacao text
    check (tempo_operacao in ('Menos de 1 ano', '1 a 3 anos', '3 a 5 anos', 'Mais de 5 anos')),
  add column if not exists consciencia_cmv text
    check (consciencia_cmv in ('Sei o número exato', 'Tenho uma estimativa', 'Não sei calcular')),
  add column if not exists maior_preocupacao text
    check (maior_preocupacao in (
      'Custo de insumos subindo mais rápido do que consigo repassar',
      'Ticket médio abaixo do que eu gostaria',
      'Não sei exatamente onde estou perdendo dinheiro',
      'Equipe e rotina de trabalho desorganizadas'
    )),
  add column if not exists decisao_intuicao text
    check (decisao_intuicao in ('Sempre', 'Frequentemente', 'Às vezes', 'Raramente')),
  add column if not exists desafio_livre text,
  add column if not exists acredita_consultor_24h text
    check (acredita_consultor_24h in ('Sim, com certeza', 'Provavelmente sim', 'Não tenho certeza', 'Não acredito'));

comment on column public.leads_diagnostico.desafio_livre is
  'Resposta livre do lead descrevendo, com as próprias palavras, o maior desafio ou dúvida na gestão do negócio.';
comment on column public.leads_diagnostico.acredita_consultor_24h is
  'Pergunta de fechamento do questionário: se um consultor virtual disponível 24h ajudaria a mudar o quadro atual do negócio. Serve como sinal de qualificação do lead.';
