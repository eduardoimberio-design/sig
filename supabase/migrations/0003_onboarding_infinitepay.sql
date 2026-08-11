-- =========================================================
-- SIG - Migration 0003: onboarding de empresa + InfinitePay
-- =========================================================

-- Campos específicos do fluxo de checkout
alter table pagamentos
  add column transaction_nsu text,
  add column invoice_slug text,
  add column checkout_url text,
  add column receipt_url text;

-- -------------------------------------------------
-- FUNÇÃO: CRIAR EMPRESA NO ONBOARDING
-- Executada logo após o cadastro do usuário no Supabase Auth.
-- Cria a empresa e vincula o usuário como 'owner', em uma
-- única transação. Roda com privilégio elevado porque no
-- momento da criação o usuário ainda não pertence a empresa
-- nenhuma (e portanto o RLS o bloquearia).
-- -------------------------------------------------
create or replace function criar_empresa_onboarding(
  p_nome_empresa text,
  p_nome_usuario text,
  p_telefone text default null,
  p_cnpj text default null
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_user_id uuid := auth.uid();
  v_empresa_id uuid;
  v_slug text;
  v_slug_base text;
  v_contador int := 0;
begin
  if v_user_id is null then
    return jsonb_build_object('sucesso', false, 'erro', 'Usuário não autenticado.');
  end if;

  -- Um usuário não pode criar uma segunda empresa por este fluxo
  if exists (select 1 from usuarios_empresa where auth_user_id = v_user_id) then
    return jsonb_build_object('sucesso', false, 'erro', 'Este usuário já pertence a uma empresa.');
  end if;

  if length(trim(p_nome_empresa)) < 2 then
    return jsonb_build_object('sucesso', false, 'erro', 'Nome da empresa inválido.');
  end if;

  -- Gera slug único a partir do nome (remove acentos e caracteres especiais)
  v_slug_base := lower(regexp_replace(
    translate(trim(p_nome_empresa),
      'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ',
      'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC'),
    '[^a-z0-9]+', '-', 'g'));
  v_slug_base := trim(both '-' from v_slug_base);
  v_slug := v_slug_base;

  while exists (select 1 from empresas where slug = v_slug) loop
    v_contador := v_contador + 1;
    v_slug := v_slug_base || '-' || v_contador;
  end loop;

  insert into empresas (nome, slug, cnpj, telefone, status, plano)
  values (trim(p_nome_empresa), v_slug, nullif(trim(p_cnpj), ''), nullif(trim(p_telefone), ''), 'ativa', 'trial')
  returning id into v_empresa_id;

  insert into usuarios_empresa (auth_user_id, empresa_id, papel, nome)
  values (v_user_id, v_empresa_id, 'owner', trim(p_nome_usuario));

  -- Sem acesso liberado: precisa pagar ou resgatar voucher.
  -- acesso_expira_em fica NULL, acesso_vitalicio fica false.

  return jsonb_build_object('sucesso', true, 'empresa_id', v_empresa_id, 'slug', v_slug);
end;
$$;

-- -------------------------------------------------
-- VIEW: situação de acesso da empresa do usuário logado
-- Simplifica a leitura no frontend.
-- -------------------------------------------------
create or replace view minha_empresa as
select
  e.id,
  e.nome,
  e.slug,
  e.status,
  e.plano,
  e.acesso_vitalicio,
  e.acesso_expira_em,
  e.origem_acesso_atual,
  (e.acesso_vitalicio or (e.acesso_expira_em is not null and e.acesso_expira_em > now())) as tem_acesso,
  case
    when e.acesso_vitalicio then null
    when e.acesso_expira_em is null then 0
    else greatest(0, extract(day from (e.acesso_expira_em - now()))::int)
  end as dias_restantes,
  ue.papel,
  ue.nome as nome_usuario
from empresas e
join usuarios_empresa ue on ue.empresa_id = e.id
where ue.auth_user_id = auth.uid();

-- A view herda o RLS das tabelas base (security_invoker),
-- garantindo que cada usuário só enxergue a própria empresa.
alter view minha_empresa set (security_invoker = true);
