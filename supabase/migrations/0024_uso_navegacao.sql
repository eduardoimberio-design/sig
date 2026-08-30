-- =========================================================
-- SIG - Migration 0024: Uso e navegação (dados de produto)
--
-- Serve para o SIG saber o que os clientes realmente usam e onde
-- eles param — base para decidir o que melhorar. Não é vigilância
-- do negócio do cliente: guardamos rota visitada e horário, nunca
-- conteúdo, nunca valor, nunca o que foi digitado.
-- =========================================================

create table uso_navegacao (
  id uuid primary key default gen_random_uuid(),

  empresa_id uuid not null references empresas(id) on delete cascade,
  auth_user_id uuid,

  -- rota normalizada: '/painel/financeiro', '/painel/estoque/documentos'
  rota text not null,

  -- módulo derivado da rota, para agregar sem precisar interpretar
  -- string toda vez: 'financeiro', 'estoque', 'marketing'...
  modulo text not null,

  created_at timestamptz not null default now()
);

create index idx_uso_navegacao_empresa
  on uso_navegacao(empresa_id, created_at desc);

create index idx_uso_navegacao_modulo
  on uso_navegacao(modulo, created_at desc);

alter table uso_navegacao enable row level security;

-- O cliente registra a própria navegação, mas não lê nada de volta.
create policy "uso_navegacao_insert" on uso_navegacao
  for insert with check (empresa_id in (select auth_empresa_ids()));

create policy "uso_navegacao_admin" on uso_navegacao
  for select using (is_admin_sig());

-- Último acesso por empresa: coluna própria evita varrer a tabela
-- inteira só para responder "quando entraram pela última vez".
alter table empresas
  add column if not exists ultimo_acesso_em timestamptz;

-- -------------------------------------------------
-- Panorama de uso para o painel administrativo.
-- Números do banco, prontos para exibir.
-- -------------------------------------------------
create or replace function admin_uso_empresas(p_dias integer default 30)
returns table (
  empresa_id uuid,
  empresa_nome text,
  ultimo_acesso timestamptz,
  dias_sem_acessar integer,
  visitas bigint,
  dias_ativos bigint,
  usuarios_ativos bigint,
  modulo_top text
)
language sql
security definer
set search_path = public
as $$
  select
    e.id,
    e.nome,
    e.ultimo_acesso_em,
    case when e.ultimo_acesso_em is null then null
         else extract(day from now() - e.ultimo_acesso_em)::integer end,
    count(u.id),
    count(distinct u.created_at::date),
    count(distinct u.auth_user_id),
    (
      select u2.modulo
      from uso_navegacao u2
      where u2.empresa_id = e.id
        and u2.created_at >= now() - (p_dias || ' days')::interval
      group by u2.modulo
      order by count(*) desc
      limit 1
    )
  from empresas e
  left join uso_navegacao u
    on u.empresa_id = e.id
   and u.created_at >= now() - (p_dias || ' days')::interval
  where is_admin_sig()
  group by e.id, e.nome, e.ultimo_acesso_em
  order by e.ultimo_acesso_em desc nulls last;
$$;

-- Distribuição de uso por módulo, somando todos os clientes.
create or replace function admin_uso_modulos(p_dias integer default 30)
returns table (
  modulo text,
  visitas bigint,
  empresas bigint
)
language sql
security definer
set search_path = public
as $$
  select
    u.modulo,
    count(*),
    count(distinct u.empresa_id)
  from uso_navegacao u
  where is_admin_sig()
    and u.created_at >= now() - (p_dias || ' days')::interval
  group by u.modulo
  order by count(*) desc;
$$;

revoke execute on function admin_uso_empresas(integer) from public;
revoke execute on function admin_uso_modulos(integer) from public;
