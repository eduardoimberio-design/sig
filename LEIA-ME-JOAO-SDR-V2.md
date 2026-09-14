# João em modo SDR — restrito à página de diagnóstico

## O que mudou em relação à versão anterior

A camada comercial agora só entra quando o visitante está **na página `/diagnostico`**.
Nas outras telas públicas (home, login, cadastro) o João volta a ser apenas anfitrião —
informativo, sem qualificar e sem vender.

A lógica por trás disso: quem está em `/diagnostico` chegou por um anúncio, post ou
indicação que prometia descobrir onde o negócio perde dinheiro. Já demonstrou intenção
antes mesmo de falar com o João. Quem está circulando pela home, não.

**Efeito colateral bom:** o modelo mais caro (Sonnet) também ficou restrito a essa
página. Nas demais telas, tudo continua rodando no modelo leve — então o custo fica
bem mais controlado do que na versão anterior.

## Resumo do comportamento final

| Onde | Quem | Como o João age | Modelo |
|---|---|---|---|
| `/diagnostico` | Visitante | Anfitrião → vira SDR ao detectar interesse | Sonnet |
| Home, login, cadastro | Visitante | Só anfitrião (como sempre foi) | Haiku |
| Qualquer tela `/painel` | Cliente logado | Orientador (como sempre foi) | Haiku |

## Passo a passo

1. **Copie os arquivos:**
   ```
   xcopy sig-joao-sdr-v2\ C:\Users\User\Documents\sig-app\ /E /H /Y
   ```

2. **Teste local:**
   ```
   npm run dev
   ```

   Numa **janela anônima** (para ficar deslogado), teste os três cenários:

   **a) Na home (`localhost:3000`)** — digite *"meu custo tá alto, não sobra nada"*.
   O João deve responder de forma informativa sobre o SIG, **sem** começar a
   qualificar nem oferecer nada.

   **b) Na página de diagnóstico (`localhost:3000/diagnostico`)** — digite a mesma
   frase. Agora ele deve mudar de marcha: perguntar sobre o negócio, entender o
   problema e conduzir para o cadastro.

   **c) Logado, em qualquer tela do painel** — confirme que continua igual ao de
   sempre: curto, orientador, sem discurso de venda.

3. **Suba pro ar:**
   ```
   git add .
   git commit -m "feat: Joao SDR restrito a pagina de diagnostico"
   git push
   ```

## Continua pendente

1. **Gravar o lead no banco** — a conversa ainda se perde ao fim. É o próximo passo
   mais importante: sem isso, o SDR conversa bem mas não deixa nada registrado.
2. **Agendamento no Google Agenda** — por enquanto o João encaminha para o WhatsApp
   quando o lead aceita a sessão.
