-- =========================================================
-- SIG - Migration 0013: Painel Administrativo
--
-- A tabela admins_sig já existe desde a 0002. Esta migration
-- acrescenta as funções que o painel precisa: visão consolidada
-- das empresas clientes e geração de vouchers em lote.
--
-- Tudo aqui é security definer com checagem explícita de admin —
-- as políticas de RLS normais restringem por empresa, e o admin
-- do SIG precisa justamente atravessar essa fronteira.
-- =========================================================

-- -------------------------------------------------
-- VISÃO CONSOLIDADA DAS EMPRESAS CLIENTES
-- -------------------------------------------------
create or replace function admin_listar_empresas()
returns table (
  id uuid,
  nome text,
  slug text,
  status status_empresa,
  plano plano_empresa,
  acesso_vitalicio boolean,
  acesso_expira_em timestamptz,
  dias_restantes integer,
  tem_acesso boolean,
  origem_acesso_atual origem_acesso,
  qtd_usuarios bigint,
  total_pago numeric,
  created_at timestamptz
)
language sql
security definer
stable
as $$
  select
    e.id,
    e.nome,
    e.slug,
    e.status,
    e.plano,
    e.acesso_vitalicio,
    e.acesso_expira_em,
    case
      when e.acesso_vitalicio then null
      when e.acesso_expira_em is null then 0
      else greatest(0, extract(day from (e.acesso_expira_em - now()))::int)
    end as dias_restantes,
    (e.acesso_vitalicio or (e.acesso_expira_em is not null and e.acesso_expira_em > now())) as tem_acesso,
    e.origem_acesso_atual,
    (select count(*) from usuarios_empresa ue where ue.empresa_id = e.id) as qtd_usuarios,
    coalesce((
      select sum(p.valor) from pagamentos p
      where p.empresa_id = e.id and p.status = 'confirmado'
    ), 0) as total_pago,
    e.created_at
  from empresas e
  where is_admin_sig()
  order by e.created_at desc;
$$;

-- -------------------------------------------------
-- MÉTRICAS GERAIS DO NEGÓCIO
-- -------------------------------------------------
create or replace function admin_metricas()
returns jsonb
language plpgsql
security definer
stable
as $$
declare
  v_resultado jsonb;
begin
  if not is_admin_sig() then
    return jsonb_build_object('erro', 'Acesso restrito a administradores.');
  end if;

  select jsonb_build_object(
    'total_empresas', (select count(*) from empresas),
    'empresas_ativas', (
      select count(*) from empresas
      where acesso_vitalicio or (acesso_expira_em is not null and acesso_expira_em > now())
    ),
    'expirando_7_dias', (
      select count(*) from empresas
      where not acesso_vitalicio
        and acesso_expira_em is not null
        and acesso_expira_em between now() and now() + interval '7 days'
    ),
    'receita_total', coalesce((
      select sum(valor) from pagamentos where status = 'confirmado'
    ), 0),
    'receita_30_dias', coalesce((
      select sum(valor) from pagamentos
      where status = 'confirmado' and data_confirmacao > now() - interval '30 days'
    ), 0),
    'vouchers_disponiveis', (
      select count(*) from vouchers where status = 'disponivel'
    )
  ) into v_resultado;

  return v_resultado;
end;
$$;

-- -------------------------------------------------
-- GERAÇÃO DE VOUCHERS EM LOTE
-- -------------------------------------------------
create or replace function admin_gerar_vouchers(
  p_quantidade integer,
  p_duracao_dias integer,   -- null se vitalício
  p_vitalicio boolean,
  p_descricao text,
  p_validade_resgate date default null
)
returns table (codigo text)
language plpgsql
security definer
as $$
declare
  v_admin_id uuid;
  i integer;
  v_codigo text;
begin
  if not is_admin_sig() then
    raise exception 'Acesso restrito a administradores.';
  end if;

  if p_quantidade < 1 or p_quantidade > 100 then
    raise exception 'Quantidade deve ser entre 1 e 100.';
  end if;

  select id into v_admin_id from admins_sig where auth_user_id = auth.uid();

  for i in 1..p_quantidade loop
    v_codigo := gerar_codigo_voucher();

    insert into vouchers (
      codigo, duracao_dias, vitalicio, descricao,
      validade_resgate, criado_por
    ) values (
      v_codigo,
      case when p_vitalicio then null else p_duracao_dias end,
      p_vitalicio,
      p_descricao,
      p_validade_resgate,
      v_admin_id
    );

    codigo := v_codigo;
    return next;
  end loop;
end;
$$;

-- -------------------------------------------------
-- CONCEDER ACESSO MANUALMENTE
-- Para venda fechada fora do sistema (transferência, dinheiro),
-- sem precisar gerar voucher intermediário.
-- -------------------------------------------------
create or replace function admin_conceder_acesso(
  p_empresa_id uuid,
  p_dias integer,
  p_vitalicio boolean default false
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_base timestamptz;
  v_nova_data timestamptz;
begin
  if not is_admin_sig() then
    return jsonb_build_object('sucesso', false, 'erro', 'Acesso restrito.');
  end if;

  if p_vitalicio then
    update empresas
      set acesso_vitalicio = true,
          origem_acesso_atual = 'cortesia_manual',
          status = 'ativa'
    where id = p_empresa_id;

    return jsonb_build_object('sucesso', true, 'vitalicio', true);
  end if;

  select greatest(coalesce(acesso_expira_em, now()), now())
    into v_base
  from empresas where id = p_empresa_id;

  v_nova_data := v_base + (p_dias || ' days')::interval;

  update empresas
    set acesso_expira_em = v_nova_data,
        origem_acesso_atual = 'cortesia_manual',
        status = 'ativa'
  where id = p_empresa_id;

  return jsonb_build_object('sucesso', true, 'expira_em', v_nova_data);
end;
$$;

-- -------------------------------------------------
-- LISTAR VOUCHERS (admin)
-- -------------------------------------------------
create or replace function admin_listar_vouchers()
returns table (
  id uuid,
  codigo text,
  duracao_dias integer,
  vitalicio boolean,
  status status_voucher,
  descricao text,
  empresa_resgate text,
  data_resgate timestamptz,
  created_at timestamptz
)
language sql
security definer
stable
as $$
  select
    v.id, v.codigo, v.duracao_dias, v.vitalicio, v.status, v.descricao,
    e.nome as empresa_resgate,
    v.data_resgate,
    v.created_at
  from vouchers v
  left join empresas e on e.id = v.empresa_id_resgate
  where is_admin_sig()
  order by v.created_at desc
  limit 200;
$$;

-- -------------------------------------------------
-- REGISTRAR O PRIMEIRO ADMIN
-- Rode manualmente uma vez, trocando pelo seu e-mail:
--
--   insert into admins_sig (auth_user_id, nome, email)
--   select id, 'Eduardo Imberio', email from auth.users
--   where email = 'seu@email.com';
-- -------------------------------------------------
