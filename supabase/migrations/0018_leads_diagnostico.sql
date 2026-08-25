-- 0018_leads_diagnostico.sql
-- Tabela de leads capturados pela landing page de Diagnóstico Grátis (topo de funil)
-- AJUSTE: se o seu projeto já numera migrations diferente de 0017 como a última aplicada,
-- renomeie este arquivo para o próximo número real antes de aplicar.

create table if not exists public.leads_diagnostico (
  id uuid primary key default gen_random_uuid(),

  -- dados de identificação do lead
  nome text not null,
  whatsapp text not null,

  -- respostas do diagnóstico
  tipo_negocio text not null check (tipo_negocio in ('Bar', 'Restaurante', 'Café / Cafeteria', 'Outro')),
  cmv_faixa text not null check (cmv_faixa in ('Até 28%', '29% a 33%', '34% a 38%', 'Acima de 38%', 'Não sei calcular')),
  dor_principal text not null check (dor_principal in (
    'CMV alto / custo fora de controle',
    'Ticket médio baixo',
    'Não sei onde estou perdendo dinheiro',
    'Equipe / operação desorganizada'
  )),

  -- resultado calculado (sempre gerado em código, nunca por IA em texto livre solto)
  causa_raiz text not null,
  acao_recomendada text not null,

  -- rastreio de origem (utm, canal de indicação etc.) — nullable, alimentado pela querystring da LP
  origem text,

  -- consentimento LGPD explícito, obrigatório no formulário
  consentimento_lgpd boolean not null default false,

  -- etapa no funil comercial, alinhado com a planilha de pipeline (Novo → Contatado → Em conversa →
  -- Demo agendada / Sessão estratégica agendada → Proposta → Fechado / Perdido)
  status text not null default 'novo' check (status in (
    'novo', 'contatado', 'em_conversa', 'sessao_agendada', 'proposta', 'fechado', 'perdido'
  )),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_leads_diagnostico_status on public.leads_diagnostico (status);
create index if not exists idx_leads_diagnostico_created_at on public.leads_diagnostico (created_at desc);

alter table public.leads_diagnostico enable row level security;

-- Nenhum acesso público direto (inserção e leitura). A gravação acontece exclusivamente
-- pela API route /api/diagnostico, que usa a service role key (que ignora RLS).
-- Não criamos policy para 'anon'/'authenticated' de propósito — isso bloqueia qualquer
-- tentativa de inserir ou ler a tabela direto do client-side.

-- AJUSTE NECESSÁRIO: adicione aqui a policy de leitura para o seu papel de admin,
-- seguindo o mesmo padrão já usado nas outras tabelas administrativas do SIG
-- (ex.: associados, cobrancas). Exemplo genérico, adapte à sua função/claim real de admin:
--
-- create policy "admin_leitura_leads_diagnostico"
--   on public.leads_diagnostico
--   for select
--   using (auth.jwt() ->> 'role' = 'admin');

-- Trigger simples para manter updated_at em dia
create or replace function public.set_updated_at_leads_diagnostico()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_leads_diagnostico_updated_at on public.leads_diagnostico;
create trigger trg_leads_diagnostico_updated_at
  before update on public.leads_diagnostico
  for each row
  execute function public.set_updated_at_leads_diagnostico();
