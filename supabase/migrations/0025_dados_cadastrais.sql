-- =========================================================
-- SIG - Migration 0025: Dados cadastrais do estabelecimento
--
-- Até aqui o cadastro só guardava nome e telefone, e não havia
-- tela nenhuma para o cliente corrigir o que errou. CNPJ existia
-- na tabela mas nada preenchia, por isso aparecia sempre vazio
-- no painel administrativo.
-- =========================================================

alter table empresas
  add column if not exists razao_social text,
  add column if not exists endereco text,
  add column if not exists cidade text,
  add column if not exists uf text,
  add column if not exists cep text,
  add column if not exists tipo_negocio text,
  add column if not exists email_contato text;

-- -------------------------------------------------
-- Admin: passa a enxergar o cadastro completo.
-- Recria a função acrescentando as colunas novas.
-- -------------------------------------------------
drop function if exists admin_listar_empresas();

create or replace function admin_listar_empresas()
returns table (
  id uuid,
  nome text,
  slug text,
  cnpj text,
  telefone text,
  razao_social text,
  email_contato text,
  endereco text,
  cidade text,
  uf text,
  cep text,
  tipo_negocio text,
  cadastro_completo boolean,
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
set search_path = public
as $$
  select
    e.id,
    e.nome,
    e.slug,
    e.cnpj,
    e.telefone,
    e.razao_social,
    e.email_contato,
    e.endereco,
    e.cidade,
    e.uf,
    e.cep,
    e.tipo_negocio,
    -- "completo" é o mínimo para emitir cobrança e falar com o cliente
    (e.cnpj is not null and e.telefone is not null and e.cidade is not null),
    e.status,
    e.plano,
    e.acesso_vitalicio,
    e.acesso_expira_em,
    case
      when e.acesso_vitalicio then null
      when e.acesso_expira_em is null then 0
      else greatest(0, extract(day from (e.acesso_expira_em - now()))::int)
    end,
    (e.acesso_vitalicio or (e.acesso_expira_em is not null and e.acesso_expira_em > now())),
    e.origem_acesso_atual,
    (select count(*) from usuarios_empresa u where u.empresa_id = e.id),
    coalesce(
      (select sum(p.valor) from pagamentos p
        where p.empresa_id = e.id and p.status = 'confirmado'),
      0
    ),
    e.created_at
  from empresas e
  where is_admin_sig()
  order by e.created_at desc;
$$;

revoke execute on function admin_listar_empresas() from public;
