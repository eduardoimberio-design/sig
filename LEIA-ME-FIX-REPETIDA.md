# Correção: pergunta do tipo de estabelecimento repetida (12/10/2026)

Dois arquivos. Sem migration. Aplicar DEPOIS do pacote sig-correcao-faixas-botoes.

## O problema
O João perguntou o tipo de estabelecimento, a pessoa clicou em "Delivery / dark kitchen",
e ele repetiu a mesma pergunta com os mesmos botões. A resposta por clique é curta e o
modelo não a reconheceu como resposta.

## A correção (em código, não no prompt)
- lib/joao-opcoes.ts: respostasJaDadas() varre a conversa e identifica, pelo texto exato,
  quais perguntas de botão já foram respondidas.
- lib/joao-ia.ts: o que já foi respondido entra no contexto como "RESPOSTAS JÁ
  REGISTRADAS — não pergunte de novo", e os botões dessa pergunta ficam bloqueados
  mesmo que o modelo peça outra vez.

Se o modelo insistir, a pessoa não vê mais os botões repetidos — o bloqueio é do sistema.
