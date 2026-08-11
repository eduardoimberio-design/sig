-- =========================================================
-- SIG - Migration 0009: Agente de Marketing + Ticket Médio
--
-- Duas frentes nesta migration:
-- 1. Conteúdo de marketing gerado a partir do catálogo real.
-- 2. Nova categoria de recomendação do Consultor IA, focada em
--    aumentar ticket médio (combo, upsell) — complementa a
--    categoria de corte de custo que já existia.
-- =========================================================

-- -------------------------------------------------
-- NOVA CATEGORIA DE RECOMENDAÇÃO
-- ALTER TYPE ... ADD VALUE não pode rodar dentro de bloco com
-- outros comandos que já usam o tipo na mesma transação — por
-- isso fica isolado no início do arquivo.
-- -------------------------------------------------
alter type categoria_recomendacao add value if not exists 'ticket_medio';

-- -------------------------------------------------
-- CONTEÚDO DE MARKETING
-- -------------------------------------------------
create type tipo_conteudo as enum ('post', 'carrossel', 'story', 'campanha');
create type status_conteudo as enum ('rascunho', 'aprovado', 'publicado', 'descartado');

create table conteudo_marketing (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,

  tipo tipo_conteudo not null,
  tema text not null,              -- o que foi pedido: "prato parado", "data comemorativa"...
  titulo text not null,
  legenda text not null,           -- texto pronto para publicar
  hashtags text[],
  slides jsonb,                    -- para carrossel: [{titulo, texto}], null para post/story

  status status_conteudo not null default 'rascunho',

  created_at timestamptz not null default now(),
  publicado_em timestamptz
);

create index idx_conteudo_empresa on conteudo_marketing(empresa_id, status, created_at desc);

alter table conteudo_marketing enable row level security;
create policy "conteudo_marketing_all" on conteudo_marketing
  for all using (empresa_id in (select auth_empresa_ids()))
  with check (empresa_id in (select auth_empresa_ids()));

-- -------------------------------------------------
-- CONFIGURAÇÃO DE TOM DE VOZ
-- Evita pedir isso a cada geração — o cliente define uma vez.
-- -------------------------------------------------
create table config_marketing (
  empresa_id uuid primary key references empresas(id) on delete cascade,
  tom_voz text not null default 'caloroso e direto',
  publico_alvo text,
  diferenciais text,               -- o que destacar sempre (ex.: "produção própria, sem conservantes")
  updated_at timestamptz not null default now()
);

alter table config_marketing enable row level security;
create policy "config_marketing_all" on config_marketing
  for all using (empresa_id in (select auth_empresa_ids()))
  with check (empresa_id in (select auth_empresa_ids()));

create trigger trg_config_marketing_updated before update on config_marketing
  for each row execute function set_updated_at();

create or replace function criar_config_marketing()
returns trigger language plpgsql security definer as $$
begin
  insert into config_marketing (empresa_id) values (new.id)
  on conflict do nothing;
  return new;
end;
$$;

create trigger trg_empresa_config_marketing after insert on empresas
  for each row execute function criar_config_marketing();

insert into config_marketing (empresa_id)
select id from empresas on conflict do nothing;
