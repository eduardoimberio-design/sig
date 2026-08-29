-- 0022_excluir_lead_diagnostico.sql
-- RPC para excluir um lead do diagnóstico, seguindo o mesmo padrão SECURITY DEFINER
-- das outras funções admin_* (checa admins_sig antes de agir).

create or replace function public.admin_excluir_lead_diagnostico(p_lead_id uuid)
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

  delete from public.leads_diagnostico where id = p_lead_id;
end;
$$;

grant execute on function public.admin_excluir_lead_diagnostico(uuid) to authenticated;
