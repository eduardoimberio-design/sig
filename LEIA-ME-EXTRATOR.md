# Correção definitiva — extração do lead em chamada separada

## Por que a correção anterior não bastou

O erro de constraint estava resolvido, mas o lead continuou não gravando — e dessa vez
sem erro nenhum em `eventos_sistema`. Isso indicou que o código **nem chegou a tentar**
gravar: o João não estava incluindo o campo `lead` no JSON da resposta.

Faz sentido quando se olha o prompt dele: roteiro, cálculo, regras de preço,
fechamento, objeções, limites, glossário. A instrução "inclua também um campo lead no
JSON" competia com tudo isso, e ele priorizava o que a pessoa vê — a conversa.

Pedir a um modelo que faça duas coisas ao mesmo tempo (conversar bem e produzir dados
estruturados) é frágil por natureza. A conversa sempre vence.

## A correção

A extração virou **uma chamada separada**, com um único trabalho: ler a conversa e
devolver os campos. Sem persona, sem roteiro, sem nada competindo por atenção.

- Roda em modelo leve (é tarefa mecânica), então o custo extra por mensagem é pequeno
- Roda a partir da 4ª mensagem e a cada mensagem seguinte — o registro vai sendo
  completado conforme a pessoa fala, e **não se perde se ela sair no meio da conversa**
- O upsert por WhatsApp (janela de 6h) evita duplicar
- Falha na extração nunca quebra a conversa

Isso é mais robusto que a abordagem anterior de duas formas: não depende do João
lembrar de nada, e captura leads que abandonam a conversa antes do fim — que na
prática são a maioria.

## Bônus: campo de agendamento

Quando o lead pede uma videochamada, agora fica registrado o dia e período que ele
sugeriu (`agendamento_solicitado`), nas palavras dele. Enquanto a integração com o
Google Agenda não existe, é isso que te permite saber quem está esperando confirmação
e para quando.

## Passo a passo

1. **Aplique a migration 0027** no SQL Editor:
   ```sql
   alter table public.leads_diagnostico
     add column if not exists agendamento_solicitado text;
   ```

2. **Copie os arquivos:**
   ```
   xcopy sig-extrator\ C:\Users\User\Documents\sig-app\ /E /H /Y
   ```

3. **Teste:**
   ```
   npm run dev
   ```
   Faça uma conversa em `localhost:3000/diagnostico`. Desta vez, **confira o Supabase
   já na metade da conversa** — o lead deve aparecer assim que você informar nome e
   WhatsApp, e ir se completando conforme você responde.

4. **Suba pro ar:**
   ```
   git add .
   git commit -m "fix: extracao do lead em chamada dedicada, independente da resposta do Joao"
   git push
   ```

## Para verificar

```sql
select nome, estabelecimento, cidade, tipo_negocio, numero_funcionarios,
       cmv_percentual, prime_cost_percentual, interesse_final,
       agendamento_solicitado, created_at
from leads_diagnostico
order by created_at desc
limit 5;
```
