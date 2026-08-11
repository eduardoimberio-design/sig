-- =========================================================
-- SIG - Migration 0012: Conselheiro
--
-- Vive dentro do Consultor IA (Módulo 6), mas em modo interativo:
-- o cliente traz um problema, o sistema conduz o raciocínio
-- estruturado em vez de só entregar um relatório pronto.
--
-- Guardado como jsonb por ferramenta — mais simples que normalizar
-- cada causa/nível/ação em tabela própria, e como cada edição
-- reescreve o bloco inteiro (sempre revisado pelo cliente antes de
-- salvar), não há perda de auditabilidade real.
-- =========================================================

create type status_caso_conselheiro as enum ('aberto', 'resolvido', 'arquivado');
create type tipo_inicial_caso as enum ('ishikawa', 'swot');

create table casos_conselheiro (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,

  titulo text not null,
  descricao_problema text not null,
  tipo_inicial tipo_inicial_caso not null,

  -- { causas: [{categoria, descricao, principal}] }
  -- categoria ∈ metodo | mao_de_obra | maquina | material | meio_ambiente | medicao
  ishikawa jsonb,

  -- { causa_origem: text, niveis: [{pergunta, resposta}] }  (5 níveis)
  cinco_porques jsonb,

  -- [{ o_que, por_que, onde, quando, quem, como, quanto_custa, status }]
  -- status ∈ pendente | em_andamento | concluido
  plano_5w2h jsonb,

  -- { forcas: [], fraquezas: [], oportunidades: [], ameacas: [] }
  swot jsonb,

  status status_caso_conselheiro not null default 'aberto',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_casos_conselheiro_empresa on casos_conselheiro(empresa_id, status, created_at desc);

alter table casos_conselheiro enable row level security;
create policy "casos_conselheiro_all" on casos_conselheiro
  for all using (empresa_id in (select auth_empresa_ids()))
  with check (empresa_id in (select auth_empresa_ids()));

create trigger trg_casos_conselheiro_updated before update on casos_conselheiro
  for each row execute function set_updated_at();
