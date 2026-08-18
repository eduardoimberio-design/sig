-- =========================================================
-- SIG - Migration 0016: Chat interno (cliente ↔ SIG)
--
-- Uma conversa por empresa, contínua — não abre e fecha
-- chamado. O cliente escreve do painel; o admin responde do
-- /admin. Fica tudo registrado, ao contrário do WhatsApp.
-- =========================================================

create table mensagens_suporte (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,

  -- quem escreveu: o cliente ou alguém do SIG
  autor text not null check (autor in ('cliente', 'sig')),
  autor_nome text,

  conteudo text not null check (length(trim(conteudo)) > 0),

  -- marcada quando o outro lado abre a conversa
  lida boolean not null default false,

  created_at timestamptz not null default now()
);

create index idx_mensagens_suporte_empresa
  on mensagens_suporte(empresa_id, created_at desc);

create index idx_mensagens_suporte_nao_lidas
  on mensagens_suporte(empresa_id, autor, lida)
  where lida = false;

alter table mensagens_suporte enable row level security;

-- Cliente enxerga e escreve apenas na conversa da própria empresa.
create policy "mensagens_suporte_cliente_select" on mensagens_suporte
  for select using (empresa_id in (select auth_empresa_ids()));

create policy "mensagens_suporte_cliente_insert" on mensagens_suporte
  for insert with check (
    empresa_id in (select auth_empresa_ids())
    and autor = 'cliente'
  );

-- Cliente marca como lida a mensagem que o SIG mandou para ele.
create policy "mensagens_suporte_cliente_update" on mensagens_suporte
  for update using (
    empresa_id in (select auth_empresa_ids()) and autor = 'sig'
  );

-- Admin do SIG atravessa tudo.
create policy "mensagens_suporte_admin_all" on mensagens_suporte
  for all using (is_admin_sig()) with check (is_admin_sig());

-- -------------------------------------------------
-- Visão para a caixa de entrada do admin: uma linha por
-- empresa que já trocou mensagem, com o que interessa
-- para priorizar — quem falou por último e quantas
-- mensagens do cliente ainda não foram lidas.
-- -------------------------------------------------
create or replace view caixa_suporte
with (security_invoker = true) as
select
  e.id                                        as empresa_id,
  e.nome                                      as empresa_nome,
  max(m.created_at)                           as ultima_em,
  (array_agg(m.autor order by m.created_at desc))[1]     as ultimo_autor,
  (array_agg(m.conteudo order by m.created_at desc))[1]  as ultimo_conteudo,
  count(*) filter (where m.autor = 'cliente' and not m.lida) as nao_lidas
from mensagens_suporte m
join empresas e on e.id = m.empresa_id
group by e.id, e.nome;
