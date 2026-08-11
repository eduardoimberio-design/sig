-- =========================================================
-- SIG - Migration 0007: Agente Comercial (WhatsApp)
--
-- As tabelas de conversas e mensagens já existem desde a 0001.
-- Esta migration acrescenta: configuração do agente por empresa,
-- controle de atendimento humano, e os índices que o painel
-- de conversas precisa para carregar rápido.
-- =========================================================

-- -------------------------------------------------
-- CAMPOS DE CONTROLE EM conversas_whatsapp
-- -------------------------------------------------
alter table conversas_whatsapp
  add column atribuida_humano boolean not null default false,
  add column ultima_mensagem_em timestamptz not null default now(),
  add column nao_lidas integer not null default 0;

create index idx_conversas_ultima_msg on conversas_whatsapp(empresa_id, ultima_mensagem_em desc);

-- Mantém ultima_mensagem_em e nao_lidas em dia sem esforço do backend
create or replace function atualizar_conversa_apos_mensagem()
returns trigger language plpgsql as $$
begin
  update conversas_whatsapp
    set ultima_mensagem_em = new.created_at,
        nao_lidas = case when new.remetente = 'cliente'
                         then nao_lidas + 1
                         else nao_lidas end
  where id = new.conversa_id;
  return new;
end;
$$;

create trigger trg_conversa_apos_mensagem after insert on mensagens_whatsapp
  for each row execute function atualizar_conversa_apos_mensagem();

-- -------------------------------------------------
-- CONFIGURAÇÃO DO AGENTE COMERCIAL, POR EMPRESA
-- -------------------------------------------------
create table config_comercial (
  empresa_id uuid primary key references empresas(id) on delete cascade,

  ativo boolean not null default false,       -- liga/desliga o agente
  nome_atendente text not null default 'Atendimento',
  mensagem_boas_vindas text,
  instrucoes_extras text,                     -- tom, promoções, regras específicas

  -- Palavras/frases que disparam transferência imediata para humano
  gatilhos_transferencia text[] not null default
    array['reclamação','reclamacao','cancelar pedido','falar com humano','atendente'],

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table config_comercial enable row level security;
create policy "config_comercial_all" on config_comercial
  for all using (empresa_id in (select auth_empresa_ids()))
  with check (empresa_id in (select auth_empresa_ids()));

create trigger trg_config_comercial_updated before update on config_comercial
  for each row execute function set_updated_at();

create or replace function criar_config_comercial()
returns trigger language plpgsql security definer as $$
begin
  insert into config_comercial (empresa_id) values (new.id)
  on conflict do nothing;
  return new;
end;
$$;

create trigger trg_empresa_config_comercial after insert on empresas
  for each row execute function criar_config_comercial();

insert into config_comercial (empresa_id)
select id from empresas on conflict do nothing;

-- -------------------------------------------------
-- Zera "não lidas" quando o humano abre a conversa
-- -------------------------------------------------
create or replace function marcar_conversa_lida(p_conversa_id uuid)
returns void
language sql
security definer
as $$
  update conversas_whatsapp set nao_lidas = 0 where id = p_conversa_id;
$$;
