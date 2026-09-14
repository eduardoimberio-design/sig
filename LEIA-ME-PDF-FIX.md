# Correção — botão de PDF não aparecia

## O que aconteceu

Mesmo padrão de falha que já vimos com a gravação do lead: o João escrevia "aqui está
o link para baixar" em texto, mas não incluía o dado estruturado (o atalho especial)
que o sistema precisa para mostrar o botão de verdade.

Faz sentido de novo pela mesma razão: pedir ao modelo para escrever uma resposta boa
**e** lembrar de incluir um campo técnico ao mesmo tempo é frágil. A resposta
conversacional sempre ganha a prioridade.

## A correção

O botão de PDF **não depende mais de nada que o João escreva**. O componente detecta
sozinho quando a mensagem contém os termos "CMV" e "Prime Cost" juntos — o que só
acontece na mensagem que entrega o resultado calculado — e a partir daí mostra um
botão fixo, sempre visível, na parte de baixo da janela de conversa.

Não é mais um atalho dentro de uma mensagem específica (que podia sumir da tela ao
rolar); é uma barra fixa, como um rodapé, que continua ali até a pessoa fechar o chat.

## Passo a passo

Nenhuma migration.

```
xcopy sig-pdf-fix\ C:\Users\User\Documents\sig-app\ /E /H /Y
```

```
npm run dev
```

Teste em janela anônima: faça a conversa até o João entregar os números (CMV, custo
de pessoal, Prime Cost). Assim que ele entregar, deve aparecer uma barra amarela fixa
embaixo, com "Baixar diagnóstico em PDF" — mesmo que o João não fale nada sobre isso
na resposta.

```
git add .
git commit -m "fix: botao de PDF nao depende mais de atalho embutido na resposta do Joao"
git push
```
