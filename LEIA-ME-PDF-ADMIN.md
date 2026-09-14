# PDF do diagnóstico no painel admin

## O que faz

Adiciona um botão **PDF** em cada linha da tabela de leads (`/admin/diagnosticos`),
ao lado do "Excluir". Clicando, o arquivo é gerado na hora com os dados gravados
daquele lead — pronto para você enviar por e-mail ou WhatsApp manualmente.

Diferente do PDF que o lead baixa durante a conversa (que interpreta o diálogo em
tempo real), aqui os números já estão no banco. Não passa pela API da Anthropic, é
instantâneo e não tem custo por uso.

## ⚠️ Uma edição manual necessária

Como não tenho o `page.tsx` dessa tela, você precisa fazer **uma alteração de duas
linhas** nele. É simples:

1. Abra o arquivo:
   ```
   notepad "app\(admin)\admin\diagnosticos\page.tsx"
   ```

2. **Na linha do import**, encontre:
   ```tsx
   import { StatusLeadSelect, ExcluirLeadButton } from "./cliente";
   ```
   E troque por:
   ```tsx
   import { StatusLeadSelect, ExcluirLeadButton, BaixarPdfButton } from "./cliente";
   ```

3. **Na tabela**, encontre a linha que tem o botão de excluir. Ela se parece com isto:
   ```tsx
   <td className="px-4 py-3">
     <ExcluirLeadButton leadId={lead.id} nomeLead={lead.nome} />
   </td>
   ```

   E troque por:
   ```tsx
   <td className="px-4 py-3">
     <div className="flex items-start gap-3">
       <BaixarPdfButton leadId={lead.id} estabelecimento={lead.estabelecimento ?? null} />
       <ExcluirLeadButton leadId={lead.id} nomeLead={lead.nome} />
     </div>
   </td>
   ```

4. Salve (Ctrl+S) e feche.

> Se o `estabelecimento` não estiver na lista de campos que a página busca, o TypeScript
> vai reclamar. Nesse caso me avise que eu ajusto — mas provavelmente está, porque a
> tela foi feita depois que esse campo passou a existir.

## Passo a passo

Nenhuma migration.

1. **Copie os arquivos:**
   ```
   xcopy sig-pdf-admin\ C:\Users\User\Documents\sig-app\ /E /H /Y
   ```

2. **Faça a edição manual** descrita acima no `page.tsx`.

3. **Teste:**
   ```
   npm run dev
   ```
   Acesse `localhost:3000/admin/diagnosticos`, clique em "PDF" num lead que tenha
   números gravados e confira se o arquivo baixa corretamente.

   Em leads sem faturamento gravado, o botão mostra "Sem números" em vez de gerar um
   PDF vazio.

4. **Suba pro ar:**
   ```
   git add .
   git commit -m "feat: botao de PDF do diagnostico no painel admin"
   git push
   ```

## Pré-requisito

Este pacote depende do `sig-pdf` (o gerador `lib/diagnostico-pdf.ts`). Se você ainda
não aplicou aquele, aplique primeiro — senão o import vai falhar.
