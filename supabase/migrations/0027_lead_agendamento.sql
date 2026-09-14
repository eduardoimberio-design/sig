-- 0027_lead_agendamento.sql
-- Quando o lead pede uma videochamada, o João anota o dia/período que ele sugeriu.
-- Enquanto a integração com o Google Agenda não existe, este campo é o que permite
-- você saber quem está esperando confirmação e para quando.
--
-- AJUSTE: confira se 0026 é mesmo a última migration aplicada antes de rodar esta.

alter table public.leads_diagnostico
  add column if not exists agendamento_solicitado text;

comment on column public.leads_diagnostico.agendamento_solicitado is
  'Dia e período que o lead pediu para a videochamada, nas palavras dele. Ex: "quarta-feira de manhã".';
