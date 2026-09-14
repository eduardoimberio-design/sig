-- 0026_leads_diagnostico_campos_opcionais.sql
--
-- causa_raiz e acao_recomendada foram criadas como obrigatórias na 0018, quando o
-- formulário sempre as calculava antes de inserir. Com o diagnóstico feito em
-- conversa, esses textos nem sempre existem no momento da gravação — e a constraint
-- estava recusando a linha inteira, fazendo o lead se perder.
--
-- Melhor um lead gravado sem o texto do diagnóstico do que lead nenhum.
--
-- AJUSTE: confira se 0025 é mesmo a última migration aplicada antes de rodar esta.

alter table public.leads_diagnostico
  alter column causa_raiz drop not null,
  alter column acao_recomendada drop not null;

-- O mesmo vale para whatsapp: numa conversa a pessoa pode sair antes de informar,
-- e ainda assim vale registrar o que ela contou.
alter table public.leads_diagnostico
  alter column whatsapp drop not null;
