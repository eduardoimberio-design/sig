# Atualização — Diagnóstico Grátis SIG (questionário de 7 perguntas)

## O que mudou

- Questionário agora tem **7 perguntas objetivas**, sem linguagem de coach (nada de "dor",
  "gargalo" etc.) — foco em fatos e comportamento observável (ex.: "com que frequência decide
  na intuição, sem número na mão").
- Pergunta 6 é um **campo aberto**, onde o lead escreve com as próprias palavras o maior desafio
  ou dúvida na gestão do negócio.
- Pergunta 7 é a **pergunta de fechamento**: se um consultor virtual disponível 24h ajudaria a
  mudar o quadro atual — isso qualifica o lead e já planta a ideia do produto antes mesmo de ver
  o resultado.
- O motor de diagnóstico (`causas.ts`) foi recalibrado pras novas perguntas.

## Passo a passo

1. **Aplique a migration `0019_leads_diagnostico_v2.sql`** no SQL Editor do Supabase. Ela:
   - remove as colunas antigas `cmv_faixa` e `dor_principal`
   - adiciona `tempo_operacao`, `consciencia_cmv`, `maior_preocupacao`, `decisao_intuicao`,
     `desafio_livre` e `acredita_consultor_24h`

   ⚠️ Isso é uma alteração estrutural na tabela — como só existem leads de teste até agora, não
   tem risco de perder dado real. Se já existirem leads reais quando você for aplicar, me avisa
   antes que eu ajusto a migration pra preservar o que for possível.

2. **Copie os arquivos com xcopy**, sobrescrevendo os antigos:
   ```
   xcopy sig-diagnostico-v2\ C:\Users\User\Documents\sig-app\ /E /H /Y
   ```
   (ajuste o caminho de origem conforme onde você extrair este pacote)

3. **Teste local:**
   ```
   npm run dev
   ```
   Abra `http://localhost:3000/diagnostico`, preencha as 7 perguntas + o campo aberto, e
   confirme que o resultado ainda aparece certo e o link de WhatsApp funciona.

4. **Confira no Supabase** se o novo lead de teste salvou os campos novos certinho
   (`Table Editor` → `leads_diagnostico`).

5. **Suba pro ar:**
   ```
   git add .
   git commit -m "feat: questionario de diagnostico com 7 perguntas"
   git push
   ```
