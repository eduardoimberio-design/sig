# João v3 — abertura, operação, preço retido e fechamento por agendamento

## As três mudanças que você pediu

### 1. Abertura reformulada

**Antes** abria anunciando o processo ("vou te fazer algumas perguntas").
**Agora** abre com o gancho, seguindo a estrutura AIDA:

> Existe um número dentro do seu negócio que decide se sobra lucro no fim do mês —
> e a maioria dos donos de bar e restaurante nunca calculou ele.

O consentimento e a confidencialidade vêm **depois** do gancho, não antes. Pedir
permissão antes de dar motivo derruba a conversa na primeira mensagem.

### 2. Preço só quando o lead estiver propenso

O João agora tem instrução firme de **não falar valores** antes da pessoa demonstrar
intenção. Se ela perguntar antes da hora, ele devolve sem fugir:

> "Te falo sim, mas deixa eu primeiro te mostrar uma coisa: pelos números que você me
> passou, tem [X mil] saindo todo mês da [estabelecimento] sem aparecer no lucro. O
> que a gente precisa ver é se dá pra recuperar parte disso — aí o investimento vira
> consequência, não decisão isolada."

**Regra importante que coloquei:** ele nunca se recusa duas vezes. Se a pessoa
insistir, informa os planos normalmente — insistir em não responder irrita e parece
que está escondendo algo.

### 3. Fechamento por agendamento, não por cadastro

O objetivo final mudou: agora é colocar a pessoa em contato com você, não fazê-la se
cadastrar sozinha. Duas opções, nesta ordem:

- **Videochamada**: "Quer que eu marque uma videochamada com ele? Me diz um dia e um
  período que funciona pra você."
- **Contato do consultor**: "Prefere que o Eduardo entre em contato direto pelo
  WhatsApp pra combinarem melhor?"

⚠️ **Importante:** o João ainda **não tem acesso à sua agenda**. Por isso ele sempre
diz que *você vai confirmar* o horário — nunca afirma que está reservado. Prometer um
horário que pode não existir queimaria a primeira impressão. Quando fizermos a
integração com o Google Agenda, isso passa a ser confirmação real.

## Mais quatro informações coletadas

Além do que já colhia, agora ele pergunta:
- Quantas pessoas trabalham no negócio
- Quantos itens tem o cardápio
- Volume de pedidos/atendimentos por mês
- **Descritivo da operação nas palavras do lead** — "me conta como funciona o dia a
  dia, o que funciona bem e o que te incomoda"

Essa última é a mais valiosa: é o contexto que número nenhum captura, e o João foi
instruído a usá-la no diagnóstico (cardápio grande + CMV alto tem causa diferente de
cardápio enxuto + CMV alto, por exemplo).

Também passou a registrar **como a conversa terminou** (`interesse_final`), para você
priorizar o follow-up: videochamada agendada, aceitou contato, quer contratar, sem
interesse, ou indefinido.

## Delivery ganhou faixa própria

Respondendo àquela pergunta que ficou pendente: criei a faixa de CMV específica para
delivery/dark kitchen (30% a 38%, contra 28% a 34% de restaurante), porque a estrutura
de custo é diferente — sem bebida de salão para diluir o CMV, com embalagem embutida
no produto e comissão de plataforma. O Prime Cost saudável também sobe para 65% nesse
modelo.

## Passo a passo

1. **Aplique a migration** `0025_leads_diagnostico_operacao.sql` no SQL Editor do
   Supabase.

2. **Copie os arquivos:**
   ```
   xcopy sig-joao-v3\ C:\Users\User\Documents\sig-app\ /E /H /Y
   ```

3. **Teste:**
   ```
   npm run dev
   ```
   Em janela anônima, `localhost:3000/diagnostico`. Confira:
   - A abertura nova, com o gancho antes do consentimento
   - Se ele pergunta sobre funcionários, cardápio, volume e pede o descritivo
   - **Pergunte o preço no meio da conversa** — ele deve devolver a pergunta sem fugir
   - Pergunte de novo — agora ele deve informar
   - No fim, ele deve oferecer a videochamada, não o cadastro
   - No Supabase, confira se os campos novos foram gravados e se **não duplicou** o
     lead (ele envia os dados duas vezes; a API atualiza em vez de criar dois)

4. **Suba pro ar:**
   ```
   git add .
   git commit -m "feat: Joao v3 - abertura AIDA, dados de operacao, preco retido, fechamento por agendamento"
   git push
   ```
