# João em modo SDR — etapa 1

## O que foi feito

Em vez de criar um segundo widget de chat (que competiria com o João e confundiria o
visitante), o João ganhou uma **camada comercial que só existe no modo público**. Cliente
logado continua tendo exatamente o João de sempre — orientador, curto, sem venda.

### Como ele decide quando vender

Duas fases dentro da mesma conversa, sem o visitante perceber a virada:

- **Fase 1 (padrão): anfitrião.** Responde o que perguntarem sobre o SIG, sem
  pergunta de qualificação, sem pressão. Quem só queria saber o que é o sistema não é
  abordado.
- **Fase 2: consultor comercial.** Entra em ação quando o visitante demonstra
  interesse real — descreve um problema do próprio negócio, pergunta se resolve o caso
  dele, pergunta preço pela segunda vez, ou responde espontaneamente sobre o negócio.

Essa foi a parte que mais exigiu cuidado: o João original dizia explicitamente
*"nunca pressione"* e *"não analise o negócio da pessoa"*. Manter isso como padrão e
liberar a condução comercial só mediante sinal de interesse preserva a boa experiência
que ele já tinha.

### O que ele faz na fase 2

1. Entende o problema real (máximo 2 perguntas de aprofundamento — não é interrogatório)
2. Devolve o diagnóstico em voz alta, para a pessoa sentir que foi ouvida
3. **Tenta o fechamento direto** → atalho para `/cadastro`
4. **Só se hesitar** → oferece a sessão de 20 min com o Eduardo
5. Trata as 7 objeções principais, com a regra "reconhecer, não discutir, devolver
   pergunta"
6. Reconhece lead desqualificado e diz com franqueza que talvez não seja o caso

## Mudanças técnicas

| O que | Antes | Agora | Por quê |
|---|---|---|---|
| Limite público | 15 msg/dia | **40 msg/dia** | Qualificação completa consome muito mais que orientação |
| Histórico | 12 mensagens | **24 mensagens** | O faturamento dito 10 mensagens atrás ainda importa no fechamento |
| Modelo (público) | Haiku | **Sonnet** | Conversa comercial precisa entender contexto e não escorregar nas regras de honestidade |
| Modelo (cliente) | Haiku | Haiku (inalterado) | Orientação de tela não precisa de mais que isso, e é o maior volume |
| Atalhos públicos | /cadastro, /login | + **/diagnostico** | O João agora pode oferecer o diagnóstico gratuito como isca de valor |

> **Sobre custo:** o modelo mais capaz só é usado com visitante. O maior volume
> (cliente logado perguntando onde fica cada tela) continua no modelo barato. Vale
> acompanhar o consumo nas primeiras semanas.

## Passo a passo

1. **Copie os arquivos:**
   ```
   xcopy sig-joao-sdr\ C:\Users\User\Documents\sig-app\ /E /H /Y
   ```
   (substitui `lib/joao-ia.ts` e `app/api/joao/route.ts`, e cria `lib/joao-sdr.ts`)

2. **Teste local:**
   ```
   npm run dev
   ```
   Abra o site **deslogado** (janela anônima) e converse com o João. Teste os dois
   comportamentos:
   - *"o que é o SIG?"* → deve responder informativo, sem vender
   - *"meu custo tá alto e não sobra nada no fim do mês"* → deve mudar de marcha,
     perguntar sobre o negócio e conduzir

   Depois entre logado e confirme que o João continua igual ao de antes (curto,
   orientador, sem discurso de venda).

3. **Suba pro ar:**
   ```
   git add .
   git commit -m "feat: Joao em modo SDR para visitantes nao logados"
   git push
   ```

## O que NÃO está nesta etapa (e por quê)

Duas coisas que você pediu ficaram de fora de propósito, porque são estruturalmente
maiores e misturá-las aqui atrasaria tudo:

**1. Gravar o lead no banco.** Hoje a conversa acontece e se perde — nada é salvo em
`leads_diagnostico`. Para salvar, é preciso decidir: em que momento salvar (a pessoa
pode sair no meio), como pedir consentimento LGPD dentro de uma conversa natural, e
como extrair os campos estruturados do texto livre. É a próxima etapa natural.

**2. Agendamento na sua agenda do Google.** Precisa de credenciais OAuth do Google
Calendar configuradas no projeto, uma rotina para ler os horários livres respeitando o
limite de 4 por dia, e criar o evento. É a etapa mais trabalhosa das três.

Por enquanto, quando o lead aceitar a sessão, o João vai encaminhar para o WhatsApp —
que funciona e não bloqueia nada.

Me avisa qual das duas você quer primeiro.
