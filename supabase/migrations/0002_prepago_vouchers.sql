-- =========================================================
-- SIG - Sistema Inteligente de Gestão
-- Migration 0002: modelo pré-pago + vouchers VIP
--
-- Princípio central: o acesso de uma empresa é decidido por
-- DOIS campos apenas — `acesso_vitalicio` e `acesso_expira_em`.
-- Pagamentos e vouchers apenas EMPURRAM essa data para frente.
-- Nenhuma outra parte do sistema precisa saber de onde veio o acesso.
-- =========================================================

-- -------------------------------------------------
-- ENUMS
-- -------------------------------------------------
create type origem_acesso as enum ('pagamento', 'voucher', 'cortesia_manual');
create type status_voucher as enum ('disponivel', 'usado', 'cancelado', 'expirado');
create type status_pagamento as enum ('pendente', 'confirmado', 'estornado', 'falhou');

-- -------------------------------------------------
-- ADMINISTRADORES DO SIG (você e sua equipe)
-- Diferente de `usuarios_empresa`, que são os clientes.
-- -------------------------------------------------
create table admins_sig (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  nome text not null,
  email text not null,
  created_at timestamptz not null default now()
);

create or replace function is_admin_sig()
returns boolean
language sql
security definer
stable
as $$
  select exists (select 1 from admins_sig where auth_user_id = auth.uid());
$$;

-- -------------------------------------------------
-- CONTROLE DE ACESSO NA TABELA EMPRESAS
-- -------------------------------------------------
alter table empresas
  add column acesso_expira_em timestamptz,
  add column acesso_vitalicio boolean not null default false,
  add column origem_acesso_atual origem_acesso;

-- Função única que responde: essa empresa pode usar o sistema agora?
create or replace function empresa_tem_acesso(p_empresa_id uuid)
returns boolean
language sql
stable
as $$
  select coalesce(
    (select acesso_vitalicio or (acesso_expira_em is not null and acesso_expira_em > now())
     from empresas where id = p_empresa_id),
    false
  );
$$;

-- -------------------------------------------------
-- PLANOS PRÉ-PAGOS
-- Preços e durações ficam como DADO, não como código —
-- você altera pelo painel sem precisar de desenvolvedor.
-- -------------------------------------------------
create table planos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,                  -- ex.: "Trimestral", "Anual"
  descricao text,
  duracao_dias integer not null,       -- quantos dias de acesso o pagamento credita
  preco numeric(12,2) not null,
  ativo boolean not null default true,
  ordem_exibicao integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -------------------------------------------------
-- PAGAMENTOS (histórico financeiro do SIG)
-- -------------------------------------------------
create table pagamentos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete restrict,
  plano_id uuid references planos(id) on delete set null,
  valor numeric(12,2) not null,
  dias_creditados integer not null,
  status status_pagamento not null default 'pendente',
  gateway text,                        -- ex.: 'asaas', 'mercadopago'
  gateway_payment_id text,
  forma_pagamento text,                -- pix, boleto, cartao
  data_confirmacao timestamptz,
  created_at timestamptz not null default now()
);

create index idx_pagamentos_empresa on pagamentos(empresa_id, status);
create unique index idx_pagamentos_gateway_id
  on pagamentos(gateway, gateway_payment_id)
  where gateway_payment_id is not null;

-- -------------------------------------------------
-- VOUCHERS VIP
-- duracao_dias NULL + vitalicio TRUE = acesso permanente
-- -------------------------------------------------
create table vouchers (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  duracao_dias integer,                -- 30, 60, 90... NULL se vitalício
  vitalicio boolean not null default false,
  status status_voucher not null default 'disponivel',
  descricao text,                      -- ex.: "Parceria Chef Gourmet - turma 2026"
  validade_resgate date,               -- até quando o código pode ser resgatado
  empresa_id_resgate uuid references empresas(id) on delete set null,
  data_resgate timestamptz,
  criado_por uuid references admins_sig(id) on delete set null,
  created_at timestamptz not null default now(),

  -- Garante coerência: ou tem duração em dias, ou é vitalício. Nunca ambos, nunca nenhum.
  constraint chk_voucher_duracao check (
    (vitalicio = true and duracao_dias is null) or
    (vitalicio = false and duracao_dias is not null and duracao_dias > 0)
  )
);

create index idx_vouchers_codigo on vouchers(codigo);
create index idx_vouchers_status on vouchers(status);

-- -------------------------------------------------
-- FUNÇÃO: RESGATAR VOUCHER
-- Transacional e à prova de uso duplo (trava a linha com FOR UPDATE).
-- Retorna a nova data de expiração do acesso.
-- -------------------------------------------------
create or replace function resgatar_voucher(p_codigo text, p_empresa_id uuid)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_voucher vouchers%rowtype;
  v_base timestamptz;
  v_nova_data timestamptz;
begin
  -- Trava a linha do voucher para impedir resgate simultâneo
  select * into v_voucher
  from vouchers
  where codigo = upper(trim(p_codigo))
  for update;

  if not found then
    return jsonb_build_object('sucesso', false, 'erro', 'Voucher não encontrado.');
  end if;

  if v_voucher.status <> 'disponivel' then
    return jsonb_build_object('sucesso', false, 'erro', 'Este voucher já foi utilizado ou está inativo.');
  end if;

  if v_voucher.validade_resgate is not null and v_voucher.validade_resgate < current_date then
    update vouchers set status = 'expirado' where id = v_voucher.id;
    return jsonb_build_object('sucesso', false, 'erro', 'Este voucher expirou.');
  end if;

  if v_voucher.vitalicio then
    update empresas
      set acesso_vitalicio = true,
          origem_acesso_atual = 'voucher',
          status = 'ativa'
    where id = p_empresa_id;
    v_nova_data := null;
  else
    -- Se ainda houver acesso vigente, soma em cima; senão, começa de agora.
    select greatest(coalesce(acesso_expira_em, now()), now())
      into v_base
    from empresas where id = p_empresa_id;

    v_nova_data := v_base + (v_voucher.duracao_dias || ' days')::interval;

    update empresas
      set acesso_expira_em = v_nova_data,
          origem_acesso_atual = 'voucher',
          status = 'ativa'
    where id = p_empresa_id;
  end if;

  update vouchers
    set status = 'usado',
        empresa_id_resgate = p_empresa_id,
        data_resgate = now()
  where id = v_voucher.id;

  return jsonb_build_object(
    'sucesso', true,
    'vitalicio', v_voucher.vitalicio,
    'expira_em', v_nova_data
  );
end;
$$;

-- -------------------------------------------------
-- FUNÇÃO: CREDITAR PAGAMENTO CONFIRMADO
-- Chamada pelo webhook do gateway. Mesma lógica de acúmulo.
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

  return jsonb_build_object('sucesso', true, 'expira_em', v_nova_data);
end;
$$;

-- -------------------------------------------------
-- GERADOR DE CÓDIGO DE VOUCHER
-- Formato legível: SIG-XXXX-XXXX (sem caracteres ambíguos)
-- -------------------------------------------------
create or replace function gerar_codigo_voucher()
returns text
language plpgsql
as $$
declare
  v_chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- sem I, O, 0, 1
  v_codigo text;
  v_existe boolean;
begin
  loop
    v_codigo := 'SIG-';
    for i in 1..4 loop
      v_codigo := v_codigo || substr(v_chars, floor(random() * length(v_chars) + 1)::int, 1);
    end loop;
    v_codigo := v_codigo || '-';
    for i in 1..4 loop
      v_codigo := v_codigo || substr(v_chars, floor(random() * length(v_chars) + 1)::int, 1);
    end loop;

    select exists(select 1 from vouchers where codigo = v_codigo) into v_existe;
    exit when not v_existe;
  end loop;

  return v_codigo;
end;
$$;

-- =========================================================
-- ROW LEVEL SECURITY
-- =========================================================
alter table admins_sig enable row level security;
alter table planos enable row level security;
alter table pagamentos enable row level security;
alter table vouchers enable row level security;

-- Admins do SIG: só admins enxergam a lista
create policy "admins_sig_select" on admins_sig
  for select using (is_admin_sig());

-- Planos: qualquer usuário autenticado pode LER (para ver preços na tela de renovação).
-- Só admin do SIG pode criar/editar.
create policy "planos_select_todos" on planos
  for select using (true);
create policy "planos_admin_write" on planos
  for all using (is_admin_sig()) with check (is_admin_sig());

-- Pagamentos: empresa vê os próprios; admin do SIG vê todos.
create policy "pagamentos_select" on pagamentos
  for select using (
    empresa_id in (select auth_empresa_ids()) or is_admin_sig()
  );
create policy "pagamentos_admin_write" on pagamentos
  for all using (is_admin_sig()) with check (is_admin_sig());

-- Vouchers: SOMENTE admin do SIG tem acesso direto à tabela.
-- O cliente nunca lê a tabela — ele resgata via função resgatar_voucher(),
-- que roda com privilégio elevado. Isso impede que alguém liste
-- todos os códigos disponíveis.
create policy "vouchers_admin_only" on vouchers
  for all using (is_admin_sig()) with check (is_admin_sig());

-- -------------------------------------------------
-- TRIGGERS
-- -------------------------------------------------
create trigger trg_planos_updated before update on planos
  for each row execute function set_updated_at();

-- -------------------------------------------------
-- DADOS INICIAIS (ajuste os preços quando definir)
-- -------------------------------------------------
insert into planos (nome, descricao, duracao_dias, preco, ordem_exibicao) values
  ('Mensal',     'Acesso por 30 dias',   30,  0.00, 1),
  ('Trimestral', 'Acesso por 90 dias',   90,  0.00, 2),
  ('Semestral',  'Acesso por 180 dias', 180,  0.00, 3),
  ('Anual',      'Acesso por 365 dias', 365,  0.00, 4);
