-- 0021_admin_leads_diagnostico.sql
-- RPCs para o painel admin acessar leads_diagnostico, seguindo o mesmo padrão de
-- admin_listar_empresas / admin_metricas / admin_listar_vouchers: SECURITY DEFINER,
-- checando admins_sig por auth.uid() antes de devolver qualquer dado.
--
-- AJUSTE: se a checagem de admin usada em admin_listar_empresas for ligeiramente
-- diferente desta (ex.: usa uma função auxiliar tipo is_admin_sig() em vez da
-- consulta direta), ajuste as 3 funções abaixo para chamar essa mesma função, por
-- consistência com o restante do projeto.

create or replace function public.admin_listar_leads_diagnostico()
returns setof public.leads_diagnostico
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.admins_sig where auth_user_id = auth.uid()
  ) then
    raise exception 'Acesso restrito a administradores';
  end if;

  return query
    select * from public.leads_diagnostico
    order by created_at desc;
end;
$$;

create or replace function public.admin_contar_leads_diagnostico_novos()
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  total bigint;
begin
  if not exists (
    select 1 from public.admins_sig where auth_user_id = auth.uid()
  ) then
    raise exception 'Acesso restrito a administradores';
  end if;

  select count(*) into total from public.leads_diagnostico where status = 'novo';
  return total;
end;
$$;

create or replace function public.admin_atualizar_status_lead_diagnostico(
  p_lead_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.admins_sig where auth_user_id = auth.uid()
  ) then
    raise exception 'Acesso restrito a administradores';
  end if;

  if p_status not in (
    'novo', 'contatado', 'em_conversa', 'sessao_agendada', 'proposta', 'fechado', 'perdido'
  ) then
    raise exception 'Status inválido: %', p_status;
  end if;

  update public.leads_diagnostico
    set status = p_status, updated_at = now()
    where id = p_lead_id;
end;
$$;

grant execute on function public.admin_listar_leads_diagnostico() to authenticated;
grant execute on function public.admin_contar_leads_diagnostico_novos() to authenticated;
grant execute on function public.admin_atualizar_status_lead_diagnostico(uuid, text) to authenticated;
