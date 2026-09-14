# João conduz o diagnóstico — formulário substituído por conversa

## O que mudou

O formulário de 7 perguntas **não existe mais**. Ao entrar em `/diagnostico`, o João
abre sozinho (após ~0,6s), se apresenta, pede o consentimento LGPD e conduz a conversa
inteira até entregar o diagnóstico e tentar o fechamento.

### A ordem da conversa

1. **Abertura + consentimento LGPD** — antes de qualquer pergunta
2. **Contato**: nome completo → WhatsApp → e-mail → estabelecimento → cidade
3. **Negócio**: tipo → faturamento → compras/insumos → custo de equipe
4. **Problema**: qual dos 4 pesa mais + pergunta aberta
5. **Diagnóstico**: números + causa provável + uma ação recomendada
6. **Fechamento**: tenta o cadastro; se hesitar, oferece a sessão com você

Assim que o João souber o nome do estabelecimento, ele passa a usar esse nome em vez
de "seu negócio" — muda bastante o tom.

### O lead é gravado automaticamente

Quando o João entrega o diagnóstico, ele devolve junto os dados apurados, que a API
grava em `leads_diagnostico` com `canal = 'conversa_joao'`. A transcrição completa da
conversa também é salva, porque os campos estruturados nunca capturam tudo que a
pessoa contou.

**Proteções que coloquei:**
- Sem consentimento explícito, **nada** é gravado
- Sem nome nem WhatsApp, nada é gravado (seria uma linha órfã)
- Os dados passam por higienização antes do banco — se o modelo devolver "R$ 60.000"
  ou um tipo de negócio fora da lista, o valor é descartado em vez de quebrar a
  constraint da tabela
- Falha ao gravar **não interrompe a conversa**: a pessoa recebe o diagnóstico
  normalmente e o erro fica registrado em `eventos_sistema` para você investigar
- O campo com os dados do lead não é devolvido ao navegador (evita expor no console)

## Passo a passo

1. **Aplique a migration** `0024_leads_diagnostico_conversa.sql` no SQL Editor do
   Supabase. Ela adiciona: `email`, `cidade`, `estabelecimento`, `canal`, `transcricao`.

2. **Copie os arquivos:**
   ```
   xcopy sig-joao-diagnostico\ C:\Users\User\Documents\sig-app\ /E /H /Y
   ```

3. **Teste local:**
   ```
   npm run dev
   ```

   Numa **janela anônima**, acesse `localhost:3000/diagnostico`. O João deve abrir
   sozinho e já pedir o consentimento. Faça a conversa inteira até o fim, com números
   fáceis de conferir (faturamento 60000, compras 20000, equipe 15000 → CMV 33,3%,
   pessoal 25%, Prime Cost 58,3%).

   Depois **confira no Supabase** (`Table Editor` → `leads_diagnostico`) se o lead foi
   gravado com todos os campos novos e a transcrição.

   Teste também: na **home** (deslogado) o João deve continuar sendo só anfitrião; e
   **logado**, igual ao de sempre.

4. **Suba pro ar:**
   ```
   git add .
   git commit -m "feat: Joao conduz o diagnostico por conversa, substituindo o formulario"
   git push
   ```

## ⚠️ Dois pontos que merecem sua atenção

**1. A API antiga (`/api/diagnostico`) continua existindo.** Não a removi — se algum
anúncio ou link antigo apontar para o formulário, nada quebra. Se você confirmar que
ninguém mais usa, dá para remover depois.

**2. Custo por conversa subiu.** A conversa de diagnóstico usa o modelo mais capaz e
pode chegar a 20-30 mensagens por lead. Vale acompanhar o consumo na primeira semana
— o limite de 40 mensagens/dia por visitante protege contra abuso, mas o custo por
lead qualificado é real. Se ficar alto demais, dá para encurtar o roteiro ou testar
um modelo intermediário.

## Continua pendente

**Agendamento no Google Agenda.** Por enquanto, quando o lead aceita a sessão, o João
passa o WhatsApp. A integração com a agenda (respeitando o limite de 4 por dia) é a
próxima etapa.
