# Empresas com dados cadastrais + Vouchers ocultar/excluir

## O que mudou

**No card de empresa (admin), ao expandir:**
- Agora mostra CNPJ, Telefone e Slug, além do que já existia (usuários, valor pago, acesso).

**Na tabela de vouchers (admin):**
- Vouchers **disponíveis** ganham um botão "Ocultar" (marca como cancelado — some da visão
  padrão, mas continua no histórico ao clicar em "Mostrar todos") e um botão "Excluir"
  (remove definitivamente).
- Vouchers **cancelados** só têm "Excluir" (não faz sentido ocultar de novo).
- Vouchers **usados** não têm nenhuma ação — preserva o histórico de resgate.

## Passo a passo

1. **Aplique a migration `0023_admin_empresas_vouchers_v2.sql`** no SQL Editor do Supabase.
   Ela recria `admin_listar_empresas` (agora com cnpj/telefone) e cria as duas RPCs novas
   de voucher.

2. **Copie os arquivos com xcopy** (isso sobrescreve `app/(admin)/admin/cliente.tsx`):
   ```
   xcopy sig-empresas-vouchers-v2\ C:\Users\User\Documents\sig-app\ /E /H /Y
   ```

3. **Teste local:**
   ```
   npm run dev
   ```
   Acesse `http://localhost:3000/admin`, expanda uma empresa e confira se CNPJ/telefone
   aparecem. Gere um voucher de teste, clique em "Ocultar", confirme, clique em "Mostrar
   todos" e veja se ele aparece como "Cancelado". Depois clique em "Excluir" nesse mesmo
   voucher e confirme que ele some de vez.

4. **Suba pro ar:**
   ```
   git add .
   git commit -m "feat: dados cadastrais no admin + ocultar/excluir vouchers"
   git push
   ```

## Nota técnica

Criei as duas novas Server Actions (`ocultarVoucher`, `excluirVoucher`) num arquivo
separado (`app/actions/admin-vouchers.ts`) em vez de mexer no `app/actions/admin.ts` que
você já tem — não vi o conteúdo desse arquivo, então preferi não arriscar sobrescrever
alguma outra função que exista lá. Funciona igual, só fica em arquivo separado. Se quiser
que eu unifique tudo num arquivo só depois, me manda o conteúdo do `admin.ts`.
