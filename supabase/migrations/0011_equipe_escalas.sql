-- =========================================================
-- SIG - Migration 0011: Módulo 7 (Equipe e Escalas)
--
-- Constrói sobre a tabela `colaboradores` já existente (Módulo 4).
-- Duas frentes: escala semanal por turno, e calendário de
-- treinamentos com histórico por colaborador.
-- =========================================================

-- -------------------------------------------------
-- ESCALA DE TRABALHO
-- Um registro por colaborador x dia da semana x turno.
-- Modelo de escala fixa semanal (repete toda semana) — cobre a
-- grande maioria dos pequenos negócios de food service. Exceção
-- pontual (folga de um dia específico) fica coberta por `ausencias`.
-- -------------------------------------------------
create table escala_trabalho (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  colaborador_id uuid not null references colaboradores(id) on delete cascade,

  dia_semana text not null,        -- 'seg','ter','qua','qui','sex','sab','dom'
  turno text not null,             -- 'manha','tarde','noite'
  horario_entrada time,
  horario_saida time,

  created_at timestamptz not null default now(),

  unique (colaborador_id, dia_semana, turno)
);

create index idx_escala_empresa on escala_trabalho(empresa_id, dia_semana);

alter table escala_trabalho enable row level security;
create policy "escala_all" on escala_trabalho
  for all using (empresa_id in (select auth_empresa_ids()))
  with check (empresa_id in (select auth_empresa_ids()));

-- -------------------------------------------------
-- FOLGAS E AUSÊNCIAS PONTUAIS
-- Exceção a uma data específica, sem mexer na escala fixa.
-- -------------------------------------------------
create type tipo_ausencia as enum ('folga', 'ferias', 'atestado', 'falta');

create table ausencias (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  colaborador_id uuid not null references colaboradores(id) on delete cascade,

  data date not null,
  tipo tipo_ausencia not null default 'folga',
  observacoes text,

  created_at timestamptz not null default now()
);

create index idx_ausencias_empresa on ausencias(empresa_id, data);

alter table ausencias enable row level security;
create policy "ausencias_all" on ausencias
  for all using (empresa_id in (select auth_empresa_ids()))
  with check (empresa_id in (select auth_empresa_ids()));

-- -------------------------------------------------
-- TREINAMENTOS
-- Catálogo de treinamentos + registro de quem participou.
-- Separar as duas tabelas permite um treinamento "Segurança
-- alimentar" ser aplicado várias vezes, com participantes
-- diferentes a cada edição.
-- -------------------------------------------------
create table treinamentos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,

  titulo text not null,
  descricao text,
  data_realizacao date not null,
  carga_horas numeric(5,1),

  created_at timestamptz not null default now()
);

create index idx_treinamentos_empresa on treinamentos(empresa_id, data_realizacao desc);

alter table treinamentos enable row level security;
create policy "treinamentos_all" on treinamentos
  for all using (empresa_id in (select auth_empresa_ids()))
  with check (empresa_id in (select auth_empresa_ids()));

create table treinamento_participantes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  treinamento_id uuid not null references treinamentos(id) on delete cascade,
  colaborador_id uuid not null references colaboradores(id) on delete cascade,

  concluido boolean not null default true,

  unique (treinamento_id, colaborador_id)
);

alter table treinamento_participantes enable row level security;
create policy "treinamento_participantes_all" on treinamento_participantes
  for all using (empresa_id in (select auth_empresa_ids()))
  with check (empresa_id in (select auth_empresa_ids()));

-- -------------------------------------------------
-- VIEW: cobertura da escala por dia/turno
-- Quantas pessoas estão escaladas em cada combinação — a base
-- para o alerta de "turno sem cobertura" na tela.
-- -------------------------------------------------
create or replace view escala_cobertura as
select
  empresa_id,
  dia_semana,
  turno,
  count(*) as qtd_colaboradores
from escala_trabalho
group by empresa_id, dia_semana, turno;

alter view escala_cobertura set (security_invoker = true);
