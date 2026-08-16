-- =========================================================
-- SIG - Migration 0015: Controle de uso do João (agente guia)
--
-- O João atende também fora da área logada, para orientar quem
-- ainda não é cliente. Isso significa que qualquer pessoa na
-- internet consegue disparar chamadas pagas à API da Anthropic.
--
-- Esta tabela é a trava: conta mensagens por origem e por dia.
-- Ninguém lê ela pelo cliente — só o servidor escreve e confere.
-- =========================================================

create table joao_uso (
  id uuid primary key default gen_random_uuid(),

  -- empresa_id quando logado; hash do IP quando visitante anônimo
  chave text not null,
  origem text not null check (origem in ('publico', 'cliente')),

  dia date not null default current_date,
  mensagens integer not null default 0,

  updated_at timestamptz not null default now(),

  unique (chave, dia)
);

create index idx_joao_uso_dia on joao_uso(dia);

-- RLS ligada e sem policy: nenhum cliente lê nem escreve aqui.
-- O acesso acontece apenas pelo service role, no servidor.
alter table joao_uso enable row level security;

-- Limpeza: registros com mais de 30 dias não têm utilidade.
-- Rode manualmente de tempos em tempos, ou agende quando quiser:
--   delete from joao_uso where dia < current_date - 30;
