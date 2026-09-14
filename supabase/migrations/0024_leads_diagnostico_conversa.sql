-- 0024_leads_diagnostico_conversa.sql
-- O diagnóstico passa a ser feito por conversa com o João, em vez de formulário.
-- Isso traz campos de contato que o formulário não coletava (e-mail, cidade,
-- estabelecimento) e a marcação de por qual caminho o lead chegou.
--
-- AJUSTE: confira se 0023 é mesmo a última migration aplicada antes de rodar esta.

alter table public.leads_diagnostico
  add column if not exists email text,
  add column if not exists cidade text,
  add column if not exists estabelecimento text,
  add column if not exists canal text not null default 'formulario'
    check (canal in ('formulario', 'conversa_joao')),
  add column if not exists transcricao text;

comment on column public.leads_diagnostico.email is
  'E-mail do lead, coletado na conversa com o João.';
comment on column public.leads_diagnostico.cidade is
  'Cidade do estabelecimento.';
comment on column public.leads_diagnostico.estabelecimento is
  'Nome do bar/restaurante/café do lead.';
comment on column public.leads_diagnostico.canal is
  'Por qual caminho o lead chegou: formulário antigo ou conversa com o João.';
comment on column public.leads_diagnostico.transcricao is
  'Transcrição da conversa com o João — contexto que os campos estruturados não capturam.';

-- O nome agora é completo, e o campo nome_completo deixa isso explícito sem
-- quebrar nada que já lia `nome`.
comment on column public.leads_diagnostico.nome is
  'Nome completo do lead.';

-- Faturamento/compras/custo de pessoal continuam podendo ser nulos: numa conversa,
-- o lead pode não saber algum número de cabeça, e isso não deve impedir o registro
-- do lead — é melhor ter um lead parcial que nenhum.
