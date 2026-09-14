# Garantia de confidencialidade dos dados financeiros

## O que mudou

A garantia aparece agora em **quatro momentos**, porque é justamente na hora de dizer
quanto fatura que o lead trava:

1. **Na abertura do João** (primeira mensagem, fixa no código — não depende do modelo):
   junto ao consentimento LGPD, ele já diz que os números são confidenciais, não são
   divulgados nem usados comercialmente.

2. **Antes de pedir o primeiro número** (etapa 2 do roteiro): reforço curto, no momento
   exato em que a resistência aparece.

3. **Se o lead demonstrar receio** (hesitar, perguntar para que serve, dizer que é
   informação sensível): o João acolhe sem pressionar, repete a garantia e oferece a
   saída de passar valores aproximados. Se ainda assim a pessoa não quiser informar,
   ele **não insiste** — segue com o que tiver e explica o que dá e o que não dá para
   calcular.

4. **Na própria página**, como texto visível logo abaixo da chamada para a conversa —
   para quem lê antes de começar.

## Arquivos alterados

- `lib/joao-sdr.ts` — roteiro com a garantia e o tratamento de receio
- `components/joao.tsx` — abertura fixa atualizada
- `app/diagnostico/page.tsx` — nota visível na página

Nenhuma migration, nenhuma mudança de API.

## Passo a passo

```
xcopy sig-joao-confidencialidade\ C:\Users\User\Documents\sig-app\ /E /H /Y
```

```
npm run dev
```

Em janela anônima, acesse `localhost:3000/diagnostico` e confira:
- A abertura do João menciona a confidencialidade
- A nota aparece na página, abaixo da chamada
- Ao chegar nos números, ele reforça a garantia
- Se você escrever algo como *"não me sinto confortável passando isso"*, ele deve
  acolher e oferecer valores aproximados, sem insistir

```
git add .
git commit -m "feat: garantia de confidencialidade dos dados financeiros no diagnostico"
git push
```
