# Ajuste de opacidade do fundo global

## Por que a foto "sumiu" no Financeiro

Não é um bug — é a combinação de duas coisas:
1. A camada escura por cima da foto estava bem forte (90–96% de opacidade).
2. Páginas largas (como o Financeiro, até 1152px) deixam pouca margem visível ao redor
   dos cards, então essa pouca margem já ficava quase preta com aquela opacidade.

Na página de diagnóstico (mais estreita, 768px), sobra mais margem visível, por isso lá
a foto aparecia bem.

## O que mudei

Reduzi a opacidade de 0.90–0.96 para **0.72–0.85** — a foto fica bem mais perceptível em
qualquer largura de tela. Como os cards (`.painel`) têm fundo sólido próprio, o texto
dentro deles não é afetado por essa mudança — só o espaço ao redor fica mais claro.

## Passo a passo

```
xcopy sig-fundo-global-v2\ C:\Users\User\Documents\sig-app\ /E /H /Y
```

```
npm run dev
```

Confira em `/painel/financeiro` (ou direto em produção depois do push) se a foto ficou
visível nas bordas/margens da tela.

```
git add .
git commit -m "fix: reduz opacidade do overlay para a foto de fundo ficar visivel"
git push
```

Se ainda achar pouco visível (ou visível demais, atrapalhando a leitura em algum lugar
específico), me avisa o número exato que prefere — é só ajustar os dois valores
`rgba(5,11,20, X)` no arquivo.
