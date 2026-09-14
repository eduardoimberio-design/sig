# Correção — erro de prefill no modelo do diagnóstico

## O que causou o erro

O código força a resposta em JSON usando "prefill": ele começa a resposta do modelo com
um `{`, então o modelo só pode continuar de dentro do JSON. É uma técnica boa — e o
Haiku, usado pelo João até agora, aceita ela.

O modelo que escolhi para a conversa de diagnóstico não aceita prefill, e recusou a
requisição com erro 400. Por isso o João quebrou só na página de diagnóstico, enquanto
continuava funcionando nas outras telas.

## A correção

Onde não há prefill, o formato passa a ser garantido de outras duas formas:

1. **Instrução explícita no final do system prompt** — um lembrete curto e direto de
   que a resposta inteira deve ser um objeto JSON, colocado por último de propósito
   (é a instrução que o modelo tem mais fresca na hora de responder).
2. **Limpeza mais robusta na leitura** — o código já recortava do primeiro `{` ao
   último `}`, o que cobre a maioria dos casos. Reforcei o fallback para também
   remover cercas de markdown (```json), caso o modelo adicione mesmo instruído a não
   fazer.

O prefill continua sendo usado nas telas que rodam no Haiku — lá ele funciona e é mais
confiável que instrução.

## Passo a passo

```
xcopy sig-fix-prefill\ C:\Users\User\Documents\sig-app\ /E /H /Y
```

```
npm run dev
```

Teste de novo em `localhost:3000/diagnostico` (janela anônima). Se ainda der erro, me
manda a mensagem exata — o detalhe técnico aparece em desenvolvimento e diz bastante.

```
git add .
git commit -m "fix: remove prefill no modelo do diagnostico que nao suporta a tecnica"
git push
```

## Se o erro persistir

Se por algum motivo o modelo do diagnóstico continuar dando problema, dá para voltar
tudo para o Haiku (que já funcionava) trocando uma linha em `lib/joao-ia.ts`:

```ts
const MODELO_DIAGNOSTICO = "claude-haiku-4-5-20251001";
```

A conversa fica um pouco menos refinada, mas funciona. É um bom plano B enquanto
investigamos.
