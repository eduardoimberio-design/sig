# Correção — lead não gravava

## O que aconteceu

O erro registrado foi claro:

> `null value in column "causa_raiz" violates not-null constraint`

As colunas `causa_raiz` e `acao_recomendada` foram criadas como **obrigatórias** lá na
migration 0018, quando só o formulário gravava leads — e ele sempre calculava esses
textos antes de inserir. Com o diagnóstico feito em conversa, o João escreve isso na
resposta mas não estava enviando nos dados estruturados. Resultado: o banco recusava
a linha inteira e o lead se perdia.

Erro meu ao montar a v3 — eu deveria ter conferido as constraints existentes antes de
mudar o caminho de gravação.

## A correção, em três camadas

1. **Migration 0026** torna `causa_raiz`, `acao_recomendada` e `whatsapp` opcionais.
   Melhor um lead gravado incompleto do que lead nenhum.

2. **O João agora envia** `causaRaiz` e `acaoRecomendada` nos dados estruturados —
   versões curtas do que escreveu na conversa. Assim você lê o diagnóstico direto no
   painel admin, sem precisar abrir a transcrição inteira.

3. **Fallback de gravação:** se o insert falhar por qualquer motivo, o código tenta de
   novo salvando apenas nome, contato e transcrição. A conversa completa fica
   registrada mesmo que algum campo específico dê problema. Isso evita que uma
   constraint futura volte a fazer o lead se perder em silêncio.

## Passo a passo

1. **Aplique a migration 0026** no SQL Editor:
   ```sql
   alter table public.leads_diagnostico
     alter column causa_raiz drop not null,
     alter column acao_recomendada drop not null;

   alter table public.leads_diagnostico
     alter column whatsapp drop not null;
   ```

2. **Copie os arquivos:**
   ```
   xcopy sig-fix-lead\ C:\Users\User\Documents\sig-app\ /E /H /Y
   ```

3. **Teste:**
   ```
   npm run dev
   ```
   Faça uma conversa completa em `localhost:3000/diagnostico` e confira no Supabase se
   o lead apareceu com todos os campos.

4. **Suba pro ar:**
   ```
   git add .
   git commit -m "fix: lead de conversa nao gravava por constraint em causa_raiz"
   git push
   ```

## Como verificar se deu certo

No SQL Editor:
```sql
select nome, estabelecimento, cidade, tipo_negocio, numero_funcionarios,
       itens_cardapio, cmv_percentual, prime_cost_percentual, interesse_final
from leads_diagnostico
order by created_at desc
limit 5;
```

E para confirmar que não há mais erros:
```sql
select created_at, tipo, mensagem
from eventos_sistema
where origem = 'joao' and tipo like 'lead%'
order by created_at desc
limit 5;
```
