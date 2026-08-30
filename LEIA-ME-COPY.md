# Nova copy da landing page de diagnóstico

## O que mudou (só texto e estrutura visual — zero mudança de lógica/API)

**Antes:** hero curto → formulário direto.

**Agora:** hero com gancho de curiosidade → agitação do problema (PAS) → autoridade
reforçada → antecipação do resultado → formulário.

### 1. Hero — gancho de curiosidade + especificidade
> "Existe um número dentro do seu negócio que decide se **sobra lucro** no fim do mês.
> Você já calculou ele?"

Técnica usada: curiosidade + especificidade (referência interna: `copywriting.md` da
skill de prospecção) em vez de abertura genérica tipo "cansado de perder dinheiro?".

### 2. Problema — estrutura PAS (Problem → Agitate → Solution embutida no restante da página)
> "Fechar o caixa 'bem' não significa que está indo bem"

Nomeia a causa real (decisão sem número, não falta de cliente) e agita a consequência
(o problema se acumula silenciosamente) — sem usar "dor" ou "gargalo", como você pediu
antes.

### 3. Autoridade — mantém a citação do Eduardo, sem inventar números de resultado
Não usei nenhum "ajudei X clientes a aumentar Y%" porque isso ainda não é um dado real
que você me passou — inventar prova social quebraria a confiança assim que alguém
perguntasse mais detalhes. Quando você tiver o primeiro resultado real de um beta, é
só me passar que eu insiro aqui como prova concreta (que é muito mais forte que
qualquer frase genérica).

### 4. Antecipação — lista do que a pessoa vai descobrir
Cria expectativa específica pelo resultado (inclusive introduzindo o termo "Prime Cost"
como um gancho de curiosidade: "o número que a maioria nunca calculou") antes mesmo de
pedir os dados no formulário — reduz a sensação de "estou preenchendo um formulário
qualquer".

### 5. Botão do hero rola direto pro formulário
Em vez de só descrever, o CTA do topo já leva pra ação (scroll suave até o formulário),
reduzindo fricção.

## Passo a passo

1. **Copie o arquivo:**
   ```
   xcopy sig-copy-diagnostico\ C:\Users\User\Documents\sig-app\ /E /H /Y
   ```
   (só substitui `app/diagnostico/page.tsx` — nenhuma migration, nenhuma API nova)

2. **Teste local:**
   ```
   npm run dev
   ```
   Abra `http://localhost:3000/diagnostico` e leia a página inteira, do topo até o
   formulário, pra sentir o fluxo de leitura.

3. **Suba pro ar:**
   ```
   git add .
   git commit -m "feat: nova copy da landing page de diagnostico (gancho, agitacao, antecipacao)"
   git push
   ```

## Nota

Deixei a mesma imagem de fundo que já estava (v5). Assim que você me mandar o
`app/layout.tsx`, eu preparo a aplicação dessa imagem em todo o site — incluindo painel
do cliente e admin, como você pediu — num pacote separado.
