# Como aplicar — Diagnóstico Grátis SIG

## O que tem neste pacote

```
supabase/migrations/0018_leads_diagnostico.sql   → tabela nova no banco
lib/diagnostico/causas.ts                        → regras do diagnóstico (calculado em código)
app/api/diagnostico/route.ts                     → recebe o formulário, salva o lead, devolve o resultado
app/diagnostico/page.tsx                         → a página em si: sig-fsi.com.br/diagnostico
```

Nenhuma dependência nova precisa ser instalada — usa `zod` e `@supabase/supabase-js`, que já
estão no seu projeto.

## Passo a passo

1. **Confira o número da migration.** Se `0017` não for mesmo a última migration aplicada no seu
   projeto, renomeie `0018_leads_diagnostico.sql` para o número correto antes de aplicar.

2. **Aplique a migration** no Supabase (SQL Editor do painel, ou `supabase db push` se você usa a
   CLI). Ela cria a tabela `leads_diagnostico` com RLS ativado e sem acesso público — só a API
   route consegue gravar, usando a service role key.

   ⚠️ Dentro do arquivo `.sql` tem um comentário marcado como **AJUSTE NECESSÁRIO**: é o local
   pra você (ou eu, numa próxima sessão com acesso ao repositório) adicionar a policy de leitura
   pro painel admin, seguindo o mesmo padrão que já existe nas outras tabelas administrativas do
   SIG.

3. **Confirme as variáveis de ambiente.** A API route usa:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

   Se o seu projeto já tem essas duas configuradas (bem provável, já que o resto do SIG usa
   Supabase), não precisa fazer nada aqui.

4. **Aplique os arquivos com xcopy**, do jeito que você já costuma fazer:
   ```
   xcopy pacote-diagnostico\ C:\Users\User\Documents\sig-app\ /E /H /Y
   ```
   (ajuste o caminho de origem conforme onde você extrair este pacote)

5. **Teste localmente:**
   ```
   npm run dev
   ```
   Abra `http://localhost:3000/diagnostico`, preencha o formulário e confirme que:
   - o resultado aparece na tela
   - o botão final abre o WhatsApp com a mensagem pré-preenchida
   - o lead aparece na tabela `leads_diagnostico` no Supabase

6. **Suba pro ar** do jeito de sempre:
   ```
   git add .
   git commit -m "feat: landing page de diagnóstico grátis para captação de leads"
   git push
   ```
   O Vercel faz o deploy automático. A página fica em `https://sig-fsi.com.br/diagnostico`.

## Como funciona o "próximo passo do funil"

Depois que o visitante vê o resultado do diagnóstico, o botão de call-to-action abre um link do
WhatsApp (`wa.me`) já com uma mensagem pronta, citando a causa raiz encontrada, pedindo a sessão
estratégica. Isso mantém o fluxo 100% dentro do WhatsApp — coerente com o fato de a integração
oficial (360dialog) estar planejada só pra Fase 2. Quando você quiser, dá pra evoluir esse passo
pra um agendamento automático (Calendly, Cal.com etc.) em vez do link direto de WhatsApp.

## O que ainda fica de fora deste pacote (de propósito)

- Policy de leitura da tabela pro painel admin (ver ajuste marcado na migration)
- Card de "Diagnósticos recebidos" no `/admin` — se você quiser visualizar os leads direto no
  painel administrativo do SIG, é um próximo pacote pequeno, me avisa que eu preparo
- Envio automático de WhatsApp (fica manual, via `wa.me`, até a integração da Fase 2)
- Notificação por e-mail/push pro Eduardo quando um novo lead chega
