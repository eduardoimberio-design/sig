-- =========================================================
-- SIG - Migration 0029: Programa de afiliados
--
-- Regras de negócio (decididas pelo Eduardo):
--   • Afiliado ganha 15% de cada pagamento confirmado do cliente
--     que indicou — primeira compra e todas as renovações, sem prazo.
--   • Cliente indicado ganha +30 dias de bônus na PRIMEIRA compra,
--     paga o plano cheio, e só em planos a partir do Trimestral.
--   • A comissão é calculada sobre o valor efetivamente pago.
--   • Pagamento estornado cancela a comissão correspondente.
--   • Vale a primeira indicação: o cliente fica ligado a um só
--     afiliado, para sempre.
--   • O repasse é manual, por Pix. O sistema calcula e registra.
--
-- Aplicar depois da 0028.
-- =========================================================

create table afiliados (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,

  nome text not null,
  email text not null,
  whatsapp text,
  documento text,                 -- CPF ou CNPJ, para o repasse
  chave_pix text,
  profissao text,                 -- consultor, contador, chef...

  -- Código público, usado no link e digitado no cadastro.
  codigo text unique,

  percentual numeric(5,2) not null default 15.00
    check (percentual > 0 and percentual <= 50),

  -- Afiliado nasce pendente: o Eduardo aprova antes de ele poder
  -- divulgar. Sem isso, qualquer pessoa gera link e ganha comissão.
  status text not null default 'pendente'
    check (status in ('pendente', 'ativo', 'suspenso')),

  aprovado_em timestamptz,
  created_at timestamptz not null default now()
);

create index idx_afiliados_codigo on afiliados(codigo);

-- Empresa passa a saber quem a indicou.
alter table empresas
  add column if not exists afiliado_id uuid references afiliados(id) on delete set null,
  add column if not exists indicado_em timestamptz,
  add column if not exists bonus_indicacao_aplicado boolean not null default false;

create index if not exists idx_empresas_afiliado on empresas(afiliado_id);

-- -------------------------------------------------
-- COMISSÕES — uma por pagamento confirmado
-- -------------------------------------------------
create table comissoes (
  id uuid primary key default gen_random_uuid(),
  afiliado_id uuid not null references afiliados(id) on delete restrict,
  empresa_id uuid not null references empresas(id) on delete restrict,

  -- Um pagamento gera no máximo uma comissão. Reprocessar o webhook
  -- nunca duplica o valor devido.
  pagamento_id uuid not null unique references pagamentos(id) on delete restrict,

  valor_base numeric(12,2) not null,
  percentual numeric(5,2) not null,
  valor_comissao numeric(12,2) not null,

  primeira_compra boolean not null default false,

  status text not null default 'pendente'
    check (status in ('pendente', 'paga', 'cancelada')),

  pago_em timestamptz,
  created_at timestamptz not null default now()
);

create index idx_comissoes_afiliado on comissoes(afiliado_id, status);

-- -------------------------------------------------
-- SEGURANÇA
-- -------------------------------------------------
alter table afiliados enable row level security;
alter table comissoes enable row level security;

-- Afiliado vê e edita o próprio cadastro — mas não se aprova,
-- não muda o próprio percentual nem gera o próprio código.
create policy "afiliado_le_proprio" on afiliados
  for select using (auth_user_id = auth.uid());

create policy "afiliado_cria_proprio" on afiliados
  for insert with check (
    auth_user_id = auth.uid()
    and status = 'pendente'
    and codigo is null
    and percentual = 15.00
  );

create policy "afiliados_admin" on afiliados
  for all using (is_admin_sig()) with check (is_admin_sig());

create policy "comissao_le_propria" on comissoes
  for select using (
    afiliado_id in (select id from afiliados where auth_user_id = auth.uid())
  );

create policy "comissoes_admin" on comissoes
  for all using (is_admin_sig()) with check (is_admin_sig());

-- Afiliado edita só os dados de contato e de repasse.
create or replace function afiliado_atualizar_dados(
  p_nome text,
  p_whatsapp text,
  p_documento text,
  p_chave_pix text,
  p_profissao text
)
returns void
language sql
security definer
set search_path = public
as $$
  update afiliados
    set nome = coalesce(nullif(trim(p_nome), ''), nome),
        whatsapp = nullif(trim(p_whatsapp), ''),
        documento = nullif(trim(p_documento), ''),
        chave_pix = nullif(trim(p_chave_pix), ''),
        profissao = nullif(trim(p_profissao), '')
  where auth_user_id = auth.uid();
$$;

-- -------------------------------------------------
-- O afiliado enxerga os clientes que indicou — só o necessário.
-- Nome do estabelecimento e se está ativo; nunca financeiro,
-- telefone ou dado de operação. É informação do cliente, não dele.
-- -------------------------------------------------
create or replace function afiliado_minhas_indicacoes()
returns table (
  estabelecimento text,
  indicado_em timestamptz,
  ativo boolean,
  total_comissao numeric
)
language sql
security definer
stable
set search_path = public
as $$
  select
    e.nome,
    e.indicado_em,
    (e.acesso_vitalicio or (e.acesso_expira_em is not null and e.acesso_expira_em > now())),
    coalesce((
      select sum(c.valor_comissao) from comissoes c
      where c.empresa_id = e.id and c.status <> 'cancelada'
    ), 0)
  from empresas e
  join afiliados a on a.id = e.afiliado_id
  where a.auth_user_id = auth.uid()
  order by e.indicado_em desc nulls last;
$$;

-- Vincula a empresa recém-criada ao afiliado do código informado.
-- Só vincula se: código existe, afiliado ativo e empresa sem
-- vínculo anterior (vale a primeira indicação).
create or replace function vincular_indicacao(
  p_empresa_id uuid,
  p_codigo text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_afiliado uuid;
begin
  -- Quem chama precisa pertencer à empresa.
  if not exists (
    select 1 from usuarios_empresa
    where empresa_id = p_empresa_id and auth_user_id = auth.uid()
  ) then
    return false;
  end if;

  select id into v_afiliado
  from afiliados
  where upper(codigo) = upper(trim(p_codigo)) and status = 'ativo';

  if v_afiliado is null then
    return false;
  end if;

  -- O afiliado não pode indicar a si mesmo.
  if exists (
    select 1 from afiliados
    where id = v_afiliado and auth_user_id = auth.uid()
  ) then
    return false;
  end if;

  update empresas
    set afiliado_id = v_afiliado, indicado_em = now()
  where id = p_empresa_id and afiliado_id is null;

  return found;
end;
$$;

-- -------------------------------------------------
-- CRÉDITO DE PAGAMENTO — mesma função de antes, com comissão e
-- bônus acrescentados na mesma transação. Ou tudo acontece, ou nada.
-- -------------------------------------------------
create or replace function creditar_pagamento(p_pagamento_id uuid)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_pag pagamentos%rowtype;
  v_base timestamptz;
  v_nova_data timestamptz;
  v_afiliado afiliados%rowtype;
  v_empresa empresas%rowtype;
  v_primeira boolean;
begin
  select * into v_pag from pagamentos where id = p_pagamento_id for update;

  if not found then
    return jsonb_build_object('sucesso', false, 'erro', 'Pagamento não encontrado.');
  end if;

  if v_pag.status = 'confirmado' then
    return jsonb_build_object('sucesso', false, 'erro', 'Pagamento já creditado.');
  end if;

  select greatest(coalesce(acesso_expira_em, now()), now())
    into v_base
  from empresas where id = v_pag.empresa_id;

  v_nova_data := v_base + (v_pag.dias_creditados || ' days')::interval;

  update empresas
    set acesso_expira_em = v_nova_data,
        origem_acesso_atual = 'pagamento',
        status = 'ativa'
  where id = v_pag.empresa_id;

  update pagamentos
    set status = 'confirmado', data_confirmacao = now()
  where id = v_pag.id;

  -- ---------- Afiliados ----------
  select * into v_empresa from empresas where id = v_pag.empresa_id;

  if v_empresa.afiliado_id is not null then
    select * into v_afiliado from afiliados where id = v_empresa.afiliado_id;

    -- Primeira compra = nenhum outro pagamento confirmado antes deste.
    v_primeira := not exists (
      select 1 from pagamentos
      where empresa_id = v_pag.empresa_id
        and status = 'confirmado'
        and id <> v_pag.id
    );

    -- Comissão só para afiliado ativo. Suspenso deixa de ganhar,
    -- mas o vínculo com o cliente permanece.
    if v_afiliado.status = 'ativo' and v_pag.valor > 0 then
      insert into comissoes (
        afiliado_id, empresa_id, pagamento_id,
        valor_base, percentual, valor_comissao, primeira_compra
      ) values (
        v_afiliado.id, v_pag.empresa_id, v_pag.id,
        v_pag.valor, v_afiliado.percentual,
        round(v_pag.valor * v_afiliado.percentual / 100, 2),
        v_primeira
      )
      on conflict (pagamento_id) do nothing;
    end if;

    -- Bônus de 30 dias: primeira compra, plano de 90 dias ou mais,
    -- uma única vez na vida do cliente.
    if v_primeira
       and v_pag.dias_creditados >= 90
       and not v_empresa.bonus_indicacao_aplicado then
      update empresas
        set acesso_expira_em = acesso_expira_em + interval '30 days',
            bonus_indicacao_aplicado = true
      where id = v_pag.empresa_id
      returning acesso_expira_em into v_nova_data;
    end if;
  end if;

  return jsonb_build_object('sucesso', true, 'expira_em', v_nova_data);
end;
$$;

-- Estorno cancela a comissão. Sem isso, dava para comprar, gerar
-- comissão e pedir o dinheiro de volta.
create or replace function cancelar_comissao_estorno()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'estornado' and old.status = 'confirmado' then
    update comissoes
      set status = 'cancelada'
    where pagamento_id = new.id and status = 'pendente';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_cancelar_comissao_estorno on pagamentos;
create trigger trg_cancelar_comissao_estorno
  after update of status on pagamentos
  for each row execute function cancelar_comissao_estorno();

notify pgrst, 'reload schema';
