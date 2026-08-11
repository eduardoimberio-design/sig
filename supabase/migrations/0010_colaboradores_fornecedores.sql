-- =========================================================
-- SIG - Migration 0010: Colaboradores e Fornecedores
--
-- Substitui os campos agregados do questionário (quantidade de
-- pessoas na cozinha, frequência de entrega genérica) por listas
-- reais, catalogáveis — a base para escala de trabalho (Módulo 7)
-- e para o agente de workflow de produção saber exatamente quem
-- faz o quê e de onde vem cada insumo.
-- =========================================================

create table colaboradores (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,

  nome text not null,
  funcao text not null,             -- ex.: Cozinheiro, Confeiteiro, Garçom
  nivel_qualificacao text,          -- 'tecnica', 'pratica', 'sem_experiencia'
  turno text,                       -- 'manha', 'tarde', 'noite', 'integral'
  ativo boolean not null default true,
  observacoes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_colaboradores_empresa on colaboradores(empresa_id, ativo);

alter table colaboradores enable row level security;
create policy "colaboradores_all" on colaboradores
  for all using (empresa_id in (select auth_empresa_ids()))
  with check (empresa_id in (select auth_empresa_ids()));

create trigger trg_colaboradores_updated before update on colaboradores
  for each row execute function set_updated_at();

-- -------------------------------------------------
create table fornecedores (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,

  nome text not null,
  categoria_fornecida text,         -- ex.: hortifruti, carnes, laticínios, secos
  dia_entrega text[],               -- dias da semana
  frequencia text,                  -- 'diaria', 'semanal', 'quinzenal', 'mensal', 'sob_demanda'
  contato text,
  observacoes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_fornecedores_empresa on fornecedores(empresa_id);

alter table fornecedores enable row level security;
create policy "fornecedores_all" on fornecedores
  for all using (empresa_id in (select auth_empresa_ids()))
  with check (empresa_id in (select auth_empresa_ids()));

create trigger trg_fornecedores_updated before update on fornecedores
  for each row execute function set_updated_at();
