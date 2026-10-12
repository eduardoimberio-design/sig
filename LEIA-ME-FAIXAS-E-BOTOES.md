# Correção: faixas, valores em reais, causa e perguntas com botão (12/10/2026)

Sem migration. Sem biblioteca nova. Substitui o pacote sig-correcao-faixas.

## 1. Faixas e números
- lib/diagnostico-calculo.ts (novo): única fonte das contas e das faixas.
- PDF: CMV e pessoal agora têm três posições (abaixo / dentro / acima). Antes o código
  só escolhia entre "acima" e "dentro", e por isso 22,2% virava "dentro de 25% a 35%".
- Valor em reais exato, igual no PDF e na ficha do admin.
- João recebe CMV, pessoal, Prime Cost e ticket médio já calculados e só narra.
- Causa só com base no que a pessoa disse; sem isso, vira hipótese. Sem "caótica".

## 2. Perguntas com botão
- lib/joao-opcoes.ts (novo): única fonte das listas fechadas, usada ao mesmo tempo
  pelos botões e pela validação antes de gravar no banco.
- Tipo de estabelecimento e dor principal agora são respondidos por clique.
- O rótulo do botão É o valor gravado: passa no CHECK da tabela por construção.
- O modelo não escreve as opções; ele só devolve a chave da pergunta.
- Quem preferir escrever continua podendo: o campo de texto segue disponível.

## 3. Arquivos alterados
lib/diagnostico-calculo.ts (novo), lib/joao-opcoes.ts (novo), lib/diagnostico-pdf.ts,
lib/joao-sdr.ts, lib/joao-ia.ts, lib/joao-extrator.ts, components/joao.tsx,
app/api/joao/route.ts, app/api/diagnostico-pdf/route.ts

Custo: uma chamada extra do modelo leve (Haiku, até 250 tokens) por mensagem do diagnóstico.
