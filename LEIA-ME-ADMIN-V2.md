# Admin v2 — Leads do Diagnóstico (padrão correto do projeto)

## Por que essa versão substitui a anterior

O pacote anterior (`sig-admin-diagnosticos`) usava a service role key direto numa API
route, porque eu não conhecia o padrão real do seu projeto. Agora que vi o código de
`app/(admin)/admin/page.tsx`, refiz tudo seguindo exatamente o mesmo padrão que já existe:
client autenticado (`@/lib/supabase/server`), RPCs `SECURITY DEFINER` que checam
`admins_sig` antes de devolver qualquer dado, e Server Actions em vez de API routes.
Isso é mais seguro e fica consistente com o resto do painel.

## ⚠️ Antes de aplicar: remova os arquivos da versão anterior

Se você já aplicou o pacote `sig-admin-diagnosticos` (ou o `-fix`), remova esses arquivos
antigos primeiro, porque eles ficariam duplicados/conflitando com a rota nova:

```
rmdir /S /Q "C:\Users\User\Documents\sig-app\app\admin\diagnosticos"
rmdir /S /Q "C:\Users\User\Documents\sig-app\app\api\admin\diagnosticos"
```

(Se o comando disser que o caminho não existe, tudo bem — só significa que você ainda
não tinha aplicado a versão anterior.)

## O que tem neste pacote

```
supabase/migrations/0021_admin_leads_diagnostico.sql   → 3 RPCs novas no banco
app/actions/admin-diagnosticos.ts                       → Server Action de atualizar status
app/(admin)/admin/diagnosticos/page.tsx                 → a tela de leads
app/(admin)/admin/diagnosticos/cliente.tsx              → dropdown de status (client component)
app/(admin)/admin/page.tsx                              → página principal do admin, ATUALIZADA
                                                            com o link "Leads" no cabeçalho e um
                                                            card de atalho, com contador de leads
                                                            novos
```

## ⚠️ Um ponto de atenção na migration

A migration cria as RPCs checando `admins_sig` do mesmo jeito que o comentário no seu
`page.tsx` sugere (`is_admin_sig`). Se as RPCs `admin_listar_empresas` / `admin_metricas`
já existentes usarem uma função auxiliar diferente pra essa checagem (em vez da consulta
direta que eu escrevi), me manda o código de uma delas que eu ajusto as 3 novas RPCs pra
ficar idêntico.

## Passo a passo

1. **Remova os arquivos antigos** (comandos acima).

2. **Aplique a migration `0021_admin_leads_diagnostico.sql`** no SQL Editor do Supabase.

3. **Copie os arquivos com xcopy:**
   ```
   xcopy sig-admin-v2\ C:\Users\User\Documents\sig-app\ /E /H /Y
   ```
   Isso vai sobrescrever o `app/(admin)/admin/page.tsx` com a versão que tem o link
   "Leads" — se você tiver feito alguma edição manual nesse arquivo depois do print que
   me mandou, ela seria perdida. Me avisa se for o caso que eu ajusto antes.

4. **Teste local:**
   ```
   npm run dev
   ```
   Acesse `http://localhost:3000/admin`, confirme que apareceu o link "Leads" no
   cabeçalho e o card "Leads do diagnóstico" na página principal. Clique nele e confirme
   que a lista de leads aparece.

5. **Suba pro ar:**
   ```
   git add .
   git commit -m "feat: pagina de leads do diagnostico integrada ao painel admin"
   git push
   ```

## Próximo passo (vouchers ocultar/excluir)

Ainda preciso do arquivo `cliente.tsx` da pasta `app/(admin)/admin` (onde ficam
`FormVouchers` e `ListaVouchers`) pra implementar isso com segurança, sem arriscar nome
de coluna errado. Mesmo processo de antes:
```
notepad "app\(admin)\admin\cliente.tsx"
```
e cola o conteúdo aqui.
