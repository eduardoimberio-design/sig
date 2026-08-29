-- 0023_admin_empresas_vouchers_v2.sql
-- (1) Acrescenta cnpj e telefone na visão admin_listar_empresas, pro admin ver os
--     dados cadastrais do estabelecimento sem precisar entrar direto no banco.
-- (2) Adiciona RPCs para ocultar (cancelar) e excluir vouchers não utilizados.
--
-- Usa is_admin_sig() para checagem de admin, mesma função já usada em
-- admin_listar_empresas / admin_metricas, por consistência com o restante do projeto.

create or replace function admin_listar_empresas()
returns table (
  id uuid,
  nome text,
  slug text,
  cnpj text,
  telefone text,
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
    e.cnpj,
    e.telefone,
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
-- OCULTAR VOUCHER (cancela, só se ainda não foi usado)
-- Voucher cancelado some da visão padrão (que filtra por "disponível"),
-- mas continua no histórico quando "mostrar todos" é ativado.
-- -------------------------------------------------
create or replace function admin_cancelar_voucher(p_voucher_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  if not is_admin_sig() then
    raise exception 'Acesso restrito a administradores.';
  end if;

  update vouchers
    set status = 'cancelado'
    where id = p_voucher_id and status = 'disponivel';
end;
$$;

-- -------------------------------------------------
-- EXCLUIR VOUCHER (definitivo)
-- Só permite excluir vouchers disponíveis ou já cancelados — nunca um
-- voucher "usado", para preservar o histórico de resgate.
-- -------------------------------------------------
create or replace function admin_excluir_voucher(p_voucher_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  if not is_admin_sig() then
    raise exception 'Acesso restrito a administradores.';
  end if;

  delete from vouchers
    where id = p_voucher_id and status in ('disponivel', 'cancelado');
end;
$$;
