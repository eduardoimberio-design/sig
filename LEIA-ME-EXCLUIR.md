# Excluir lead — atualização

## O que foi adicionado

- Nova coluna na tabela de leads com um botão **"Excluir"** discreto (cinza, fica destacado
  em vermelho só ao passar o mouse).
- Clicar nele pede confirmação inline ("Excluir [nome]? Confirmar / Cancelar") antes de
  apagar de verdade — evita clique acidental.
- A exclusão é definitiva (remove a linha do banco), então use pros leads que realmente não
  evoluíram no funil (ex.: status "Perdido" há muito tempo, ou testes seus).

## Passo a passo

1. **Aplique a migration `0022_excluir_lead_diagnostico.sql`** no SQL Editor do Supabase.

2. **Copie os arquivos com xcopy** (vai sobrescrever `cliente.tsx`, `page.tsx` da pasta
   diagnosticos, e o arquivo de Server Actions):
   ```
   xcopy sig-excluir-lead\ C:\Users\User\Documents\sig-app\ /E /H /Y
   ```

3. **Teste local:**
   ```
   npm run dev
   ```
   Acesse `http://localhost:3000/admin/diagnosticos`, clique em "Excluir" num lead de
   teste, confirme, e veja se ele some da lista.

4. **Suba pro ar:**
   ```
   git add .
   git commit -m "feat: opcao de excluir lead do diagnostico"
   git push
   ```
