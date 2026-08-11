-- =========================================================
-- SIG - Migration 0006: Storage bucket para documentos
-- =========================================================

insert into storage.buckets (id, name, public)
values ('documentos', 'documentos', false)
on conflict (id) do nothing;

-- Cada empresa só acessa arquivos dentro da própria pasta.
-- Convenção de caminho: documentos/{empresa_id}/{arquivo}
create policy "documentos_storage_select"
on storage.objects for select
using (
  bucket_id = 'documentos'
  and (storage.foldername(name))[1]::uuid in (select auth_empresa_ids())
);

create policy "documentos_storage_insert"
on storage.objects for insert
with check (
  bucket_id = 'documentos'
  and (storage.foldername(name))[1]::uuid in (select auth_empresa_ids())
);

create policy "documentos_storage_delete"
on storage.objects for delete
using (
  bucket_id = 'documentos'
  and (storage.foldername(name))[1]::uuid in (select auth_empresa_ids())
);
