# Imagem de fundo em todo o site

## O que mudou

Movi a imagem de fundo (a mesma foto de bar/calculadora/café) do `body` do layout raiz
do projeto — isso significa que **toda página do site** herda esse fundo automaticamente:
diagnóstico, login, cadastro, painel do cliente, admin. Não precisa editar página por
página.

A `/diagnostico` já tinha esse fundo aplicado diretamente nela (v5) — isso não causa
conflito, só fica redundante nessa página específica (a imagem dela cobre a do body,
mesmo efeito visual). Se quiser, depois eu limpo esse código duplicado, mas não atrapalha
em nada deixar como está.

## ⚠️ Ponto de atenção

Como o admin e o painel do cliente têm bastante tabela e texto denso, testar com atenção
se a leitura continua confortável, principalmente:
- Tabela de leads do diagnóstico (`/admin/diagnosticos`)
- Lista de empresas e vouchers (`/admin`)
- Formulário de perfil (`/painel/perfil`)

Como esses elementos já usam a classe `.painel` (fundo sólido escuro), a foto só deve
aparecer nas bordas/margens ao redor dos cards — mas vale conferir com seus próprios
olhos, porque eu não tenho como renderizar e ver o resultado final.

## Passo a passo

1. **Copie o arquivo:**
   ```
   xcopy sig-fundo-global\ C:\Users\User\Documents\sig-app\ /E /H /Y
   ```
   (isso substitui só o `app/layout.tsx`)

2. **Teste local:**
   ```
   npm run dev
   ```
   Passeie por várias páginas: `/`, `/login`, `/diagnostico`, `/painel`, `/painel/perfil`,
   `/admin`, `/admin/diagnosticos` — confirme que o fundo aparece em todas e que nada
   ficou difícil de ler.

3. **Suba pro ar:**
   ```
   git add .
   git commit -m "feat: imagem de fundo aplicada globalmente no layout raiz"
   git push
   ```

## Se ficar escuro/claro demais em algum lugar

Me avisa qual página incomodou que eu ajusto a opacidade da camada escura
(`rgba(5,11,20,0.90)` e `rgba(5,11,20,0.96)` no código) — dá pra deixar mais escuro só
pra reforçar contraste em telas com muito texto, sem mudar a imagem em si.
