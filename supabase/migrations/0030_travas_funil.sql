-- =========================================================
-- SIG - Migration 0030: trava de acessos ao funil
--
-- Diagnóstico e degustação passam a ter limite de 2 acessos por lead. Quem
-- chegar ao limite é mandado para o WhatsApp, onde há uma pessoa para
-- conversar — a trava não é para barrar, é para transformar insistência em
-- contato humano.
--
-- POR QUE UMA TABELA NOVA, E NÃO joao_uso: joao_uso conta MENSAGENS POR DIA e
-- é zerada todo dia, de propósito (ela protege o custo da API). Aqui a conta é
-- outra: SESSÕES acumuladas para sempre. Misturar as duas obrigaria a reescrever
-- a proteção de custo, que funciona.
--
-- DUAS CHAVES POR PESSOA: o aparelho (hash do IP) e o WhatsApp, quando ela
-- informa. Qualquer uma das duas no limite já bloqueia. Sozinho, o aparelho é
-- contornável com uma janela anônima; sozinho, o WhatsApp exigiria pedir o
-- contato antes de qualquer coisa. Juntos, cobrem um ao outro.
-- =========================================================

create table if not exists acessos_funil (
  id uuid primary key default gen_random_uuid(),

  -- 'diagnostico' | 'degustacao'. Os limites são contados separadamente:
  -- quem usou os 2 diagnósticos ainda tem as 2 degustações.
  recurso text not null check (recurso in ('diagnostico', 'degustacao')),

  -- 'aparelho' (hash do IP) ou 'whatsapp' (só dígitos).
  tipo_chave text not null check (tipo_chave in ('aparelho', 'whatsapp')),
  chave text not null,

  acessos integer not null default 0,

  -- Sessão em curso. Enquanto for a mesma, atualizar a página ou navegar entre
  -- as telas não consome outro acesso — só uma entrada nova consome.
  sessao_atual text,

  primeiro_em timestamptz not null default now(),
  ultimo_em timestamptz not null default now(),

  unique (recurso, tipo_chave, chave)
);

create index if not exists idx_acessos_funil_ultimo on acessos_funil(ultimo_em);

-- RLS ligada e sem policy, como em joao_uso: ninguém lê nem escreve pelo
-- navegador. Só o servidor, com a chave de serviço.
alter table acessos_funil enable row level security;

comment on table acessos_funil is
  'Conta sessões de diagnóstico e degustação por aparelho e por WhatsApp. Limite aplicado no servidor; ver lib/acessos.ts.';

notify pgrst, 'reload schema';
