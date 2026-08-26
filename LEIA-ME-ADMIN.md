# Painel admin — Leads do Diagnóstico

## O que tem neste pacote

```
app/admin/diagnosticos/page.tsx          → a tela em si: sig-fsi.com.br/admin/diagnosticos
app/admin/diagnosticos/StatusSelect.tsx  → dropdown pra mudar a etapa do lead na hora
app/api/admin/diagnosticos/[id]/route.ts → API que salva a mudança de status
```

Mostra todos os leads que preencheram o diagnóstico, com CMV%, custo de pessoal%, Prime Cost%,
a preocupação escolhida, a resposta da pergunta 7 e o texto que a pessoa escreveu no campo aberto.
Dá pra filtrar por etapa do funil (Novo, Contatado, Em conversa, Sessão agendada, Proposta,
Fechado, Perdido) e mudar a etapa direto na tabela, sem entrar no Supabase.

## ⚠️ Dois ajustes de segurança que preciso que você (ou eu, com acesso ao repositório) faça antes de considerar isso pronto

Eu não tenho acesso ao seu repositório real, então não sei exatamente como o resto do painel
admin do SIG (`/admin/suporte` etc.) verifica se quem está acessando é realmente você — se por
sessão do Supabase Auth, cookie, ou outro mecanismo. Marquei os dois pontos onde isso precisa
entrar:

1. **`app/admin/diagnosticos/page.tsx`** — assume que existe um `app/admin/layout.tsx` (ou
   middleware) que já protege tudo sob `/admin`. Se isso já existir no seu projeto (bem provável,
   já que `/admin/suporte` existe), não precisa fazer nada — a proteção é herdada automaticamente.
   Se não existir, essa página fica **aberta para qualquer pessoa que descobrir a URL**.

2. **`app/api/admin/diagnosticos/[id]/route.ts`** (PATCH) — o comentário marcado como AJUSTE
   NECESSÁRIO é onde entra a mesma checagem de sessão de admin usada nas outras rotas
   `/api/admin/*` do projeto.

Se você não tiver certeza de como isso já funciona no resto do painel, me diga qual é o
mecanismo (ex.: "uso Supabase Auth com uma tabela de admins" ou "tenho um middleware.ts que
verifica X") que eu ajusto o código com a checagem certa.

## Passo a passo

1. **Copie os arquivos com xcopy:**
   ```
   xcopy sig-admin-diagnosticos\ C:\Users\User\Documents\sig-app\ /E /H /Y
   ```
   (confira o caminho real de onde você extraiu o zip, como das últimas vezes)

2. **Teste local:**
   ```
   npm run dev
   ```
   Acesse `http://localhost:3000/admin/diagnosticos` (logado como admin, se já existir esse
   fluxo) e confira se os leads aparecem, se os filtros funcionam e se mudar o status na tabela
   realmente salva (recarregue a página pra confirmar que persistiu).

3. **Suba pro ar:**
   ```
   git add .
   git commit -m "feat: painel admin de leads do diagnostico"
   git push
   ```

## Próximo passo natural

Se fizer sentido, dá pra adicionar um resumo no topo (quantos leads em cada etapa, taxa de
conversão) ou um botão de exportar pra CSV. É só pedir.
