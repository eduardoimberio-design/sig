-- =========================================================
-- SIG - Migration 0014: Anexos de contexto por agente
--
-- Não é arquivo morto. O cliente sobe print, PDF ou foto para
-- DAR CONTEXTO ao agente: print do painel do Instagram para o
-- Marketing, print de conversa para o Conselheiro, extrato para
-- o Financeiro. A IA lê e resume; o resumo só entra no raciocínio
-- dos agentes DEPOIS de confirmado pelo cliente.
--
-- Mesma regra do Estoque: leitura por visão erra, então nada é
-- usado como verdade sem passar por confirmação humana.
-- =========================================================

create type modulo_anexo as enum (
  'financeiro',
  'estoque',
  'marketing',
  'equipe',
  'conselheiro'
);

create type status_anexo as enum ('aguardando', 'confirmado', 'descartado');

create table anexos_contexto (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,

  modulo modulo_anexo not null,

  nome_arquivo text not null,
  storage_path text not null,
  tipo_arquivo text not null,          -- pdf | imagem
  tamanho_bytes integer,

  -- o que o cliente disse que é (opcional, ajuda a IA a ler certo)
  descricao text,

  -- o que a IA leu do arquivo, em texto corrido. É este campo que
  -- os agentes consomem — nunca o arquivo bruto.
  resumo_ia text,

  status status_anexo not null default 'aguardando',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_anexos_contexto_empresa
  on anexos_contexto(empresa_id, modulo, status, created_at desc);

alter table anexos_contexto enable row level security;

create policy "anexos_contexto_all" on anexos_contexto
  for all using (empresa_id in (select auth_empresa_ids()))
  with check (empresa_id in (select auth_empresa_ids()));

create trigger trg_anexos_contexto_updated_at
  before update on anexos_contexto
  for each row execute function set_updated_at();
