-- =========================================================
-- SIG - Sistema Inteligente de Gestão
-- Migration 0001: infraestrutura multi-tenant + Módulo 1
-- Pilares cobertos nesta migration: base (empresas/usuários),
-- Financeiro, Estoque/CMV, Comercial (estrutura de dados).
-- Lógica dos agentes de IA entra em migrations futuras.
-- =========================================================

-- -------------------------------------------------
-- EXTENSÕES
-- -------------------------------------------------
create extension if not exists "pgcrypto";

-- -------------------------------------------------
-- ENUMS
-- -------------------------------------------------
create type plano_empresa as enum ('trial', 'starter', 'pro', 'enterprise');
create type status_empresa as enum ('ativa', 'inadimplente', 'suspensa', 'cancelada');
create type papel_usuario as enum ('owner', 'admin', 'colaborador');
create type status_conta as enum ('pendente', 'pago', 'atrasado', 'cancelado');
create type tipo_movimento_estoque as enum ('entrada', 'saida', 'ajuste', 'perda');

-- -------------------------------------------------
-- TENANTS (EMPRESAS CLIENTES DO SIG)
-- -------------------------------------------------
create table empresas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  slug text not null unique,
  cnpj text unique,
  telefone text,
  plano plano_empresa not null default 'trial',
  status status_empresa not null default 'ativa',
  whatsapp_numero text,               -- número conectado via 360dialog
  whatsapp_channel_id text,           -- ID do canal na 360dialog
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Vínculo entre usuários de autenticação (auth.users) e empresas
create table usuarios_empresa (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  empresa_id uuid not null references empresas(id) on delete cascade,
  papel papel_usuario not null default 'colaborador',
  nome text not null,
  created_at timestamptz not null default now(),
  unique (auth_user_id, empresa_id)
);

create index idx_usuarios_empresa_auth_user on usuarios_empresa(auth_user_id);
create index idx_usuarios_empresa_empresa on usuarios_empresa(empresa_id);

-- Função helper: retorna empresa(s) do usuário autenticado
create or replace function auth_empresa_ids()
returns setof uuid
language sql
security definer
stable
as $$
  select empresa_id from usuarios_empresa where auth_user_id = auth.uid();
$$;

-- =========================================================
-- PILAR 2: FINANCEIRO
-- =========================================================
create table contas_pagar (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  descricao text not null,
  categoria text,                     -- ex.: insumos, aluguel, folha, marketing
  fornecedor text,
  valor numeric(12,2) not null,
  vencimento date not null,
  status status_conta not null default 'pendente',
  data_pagamento timestamptz,
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table contas_receber (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  descricao text not null,
  cliente text,
  valor numeric(12,2) not null,
  vencimento date not null,
  status status_conta not null default 'pendente',
  data_recebimento timestamptz,
  forma_pagamento text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_contas_pagar_empresa on contas_pagar(empresa_id, status, vencimento);
create index idx_contas_receber_empresa on contas_receber(empresa_id, status, vencimento);

-- =========================================================
-- PILAR 3: ESTOQUE / FICHA TÉCNICA / CMV
-- =========================================================
create table insumos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  nome text not null,
  unidade_medida text not null,        -- kg, g, l, ml, un
  custo_unitario numeric(12,4) not null default 0,
  estoque_atual numeric(12,3) not null default 0,
  estoque_minimo numeric(12,3) not null default 0,
  fornecedor_principal text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table produtos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  nome text not null,
  categoria text,                      -- ex.: entrada, prato principal, bebida
  preco_venda numeric(12,2) not null,
  descricao text,
  foto_url text,
  ativo_catalogo boolean not null default true,  -- exibido no agente comercial
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Ficha técnica: composição de cada produto em insumos (para cálculo de CMV)
create table ficha_tecnica_itens (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  produto_id uuid not null references produtos(id) on delete cascade,
  insumo_id uuid not null references insumos(id) on delete restrict,
  quantidade numeric(12,4) not null,   -- na unidade de medida do insumo
  created_at timestamptz not null default now()
);

create table estoque_movimentos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  insumo_id uuid not null references insumos(id) on delete cascade,
  tipo tipo_movimento_estoque not null,
  quantidade numeric(12,3) not null,
  motivo text,
  created_at timestamptz not null default now()
);

create index idx_insumos_empresa on insumos(empresa_id);
create index idx_produtos_empresa on produtos(empresa_id);
create index idx_ficha_tecnica_produto on ficha_tecnica_itens(produto_id);
create index idx_estoque_mov_empresa on estoque_movimentos(empresa_id, insumo_id);

-- =========================================================
-- PILAR 1: COMERCIAL (WHATSAPP) — estrutura base
-- Lógica de conversa/IA entra em migration futura;
-- aqui só o registro de conversas e mensagens.
-- =========================================================
create table conversas_whatsapp (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  contato_telefone text not null,
  contato_nome text,
  status text not null default 'aberta', -- aberta, encerrada, transferida_humano
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table mensagens_whatsapp (
  id uuid primary key default gen_random_uuid(),
  conversa_id uuid not null references conversas_whatsapp(id) on delete cascade,
  empresa_id uuid not null references empresas(id) on delete cascade,
  remetente text not null,       -- 'cliente' | 'agente_ia' | 'humano'
  conteudo text not null,
  created_at timestamptz not null default now()
);

create index idx_conversas_empresa on conversas_whatsapp(empresa_id, contato_telefone);
create index idx_mensagens_conversa on mensagens_whatsapp(conversa_id);

-- =========================================================
-- ROW LEVEL SECURITY
-- =========================================================
alter table empresas enable row level security;
alter table usuarios_empresa enable row level security;
alter table contas_pagar enable row level security;
alter table contas_receber enable row level security;
alter table insumos enable row level security;
alter table produtos enable row level security;
alter table ficha_tecnica_itens enable row level security;
alter table estoque_movimentos enable row level security;
alter table conversas_whatsapp enable row level security;
alter table mensagens_whatsapp enable row level security;

-- Empresas: usuário só vê a(s) empresa(s) a que pertence
create policy "empresas_select_own" on empresas
  for select using (id in (select auth_empresa_ids()));

create policy "empresas_update_admin" on empresas
  for update using (
    id in (
      select empresa_id from usuarios_empresa
      where auth_user_id = auth.uid() and papel in ('owner','admin')
    )
  );

-- usuarios_empresa: só vê vínculos da própria empresa
create policy "usuarios_empresa_select" on usuarios_empresa
  for select using (empresa_id in (select auth_empresa_ids()));

-- Política genérica reaplicada tabela a tabela (RLS não suporta herança direta)
create policy "contas_pagar_all" on contas_pagar
  for all using (empresa_id in (select auth_empresa_ids()))
  with check (empresa_id in (select auth_empresa_ids()));

create policy "contas_receber_all" on contas_receber
  for all using (empresa_id in (select auth_empresa_ids()))
  with check (empresa_id in (select auth_empresa_ids()));

create policy "insumos_all" on insumos
  for all using (empresa_id in (select auth_empresa_ids()))
  with check (empresa_id in (select auth_empresa_ids()));

create policy "produtos_all" on produtos
  for all using (empresa_id in (select auth_empresa_ids()))
  with check (empresa_id in (select auth_empresa_ids()));

create policy "ficha_tecnica_all" on ficha_tecnica_itens
  for all using (empresa_id in (select auth_empresa_ids()))
  with check (empresa_id in (select auth_empresa_ids()));

create policy "estoque_mov_all" on estoque_movimentos
  for all using (empresa_id in (select auth_empresa_ids()))
  with check (empresa_id in (select auth_empresa_ids()));

create policy "conversas_all" on conversas_whatsapp
  for all using (empresa_id in (select auth_empresa_ids()))
  with check (empresa_id in (select auth_empresa_ids()));

create policy "mensagens_all" on mensagens_whatsapp
  for all using (empresa_id in (select auth_empresa_ids()))
  with check (empresa_id in (select auth_empresa_ids()));

-- =========================================================
-- TRIGGER: updated_at automático
-- =========================================================
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_empresas_updated before update on empresas
  for each row execute function set_updated_at();
create trigger trg_contas_pagar_updated before update on contas_pagar
  for each row execute function set_updated_at();
create trigger trg_contas_receber_updated before update on contas_receber
  for each row execute function set_updated_at();
create trigger trg_insumos_updated before update on insumos
  for each row execute function set_updated_at();
create trigger trg_produtos_updated before update on produtos
  for each row execute function set_updated_at();
create trigger trg_conversas_updated before update on conversas_whatsapp
  for each row execute function set_updated_at();
