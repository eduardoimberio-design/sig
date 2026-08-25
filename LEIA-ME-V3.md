# Atualização v3 — Diagnóstico com dados financeiros reais

## O que mudou

- As perguntas 2, 3 e 4 agora pedem **números reais**: faturamento mensal, gasto com
  compras/insumos e gasto com equipe — em vez de perguntas de múltipla escolha qualitativas.
- O motor de diagnóstico agora **calcula de verdade**: CMV%, custo de pessoal% e **Prime Cost%**
  (a soma dos dois — indicador clássico de saúde financeira em food service), comparando cada um
  com faixas de referência do setor (ajustadas por tipo de negócio no caso do CMV).
- A devolutiva ficou em **3 blocos**: Leitura financeira (números + benchmark), Causa raiz
  provável (cruzando os números com a maior preocupação declarada) e Ação recomendada — bem mais
  robusta e "consultiva" do que a versão anterior.
- Os 3 indicadores aparecem em destaque no topo do resultado (CMV / Custo de pessoal / Prime Cost).

## Passo a passo

1. **Pare o servidor local** se estiver rodando (Ctrl+C).

2. **Aplique a migration `0020_leads_diagnostico_v3.sql`** no SQL Editor do Supabase. Ela:
   - remove `tempo_operacao`, `consciencia_cmv`, `decisao_intuicao` (não são mais usadas)
   - adiciona `faturamento_mensal`, `compras_mensal`, `custo_funcionarios_mensal`,
     `cmv_percentual`, `custo_pessoal_percentual`, `prime_cost_percentual`, `leitura_financeira`

3. **Copie os arquivos com xcopy**, sobrescrevendo os antigos:
   ```
   xcopy sig-diagnostico-v3\ C:\Users\User\Documents\sig-app\ /E /H /Y
   ```
   (ajuste o caminho de origem — extraia o zip e confira o caminho real com `dir`, como da
   última vez, antes de rodar)

4. **Teste local:**
   ```
   npm run dev
   ```
   Abra `http://localhost:3000/diagnostico`, preencha com números de teste (ex.: faturamento
   R$ 60.000, compras R$ 20.000, equipe R$ 15.000) e confira se os 3 indicadores aparecem
   corretos: CMV 33,3%, custo de pessoal 25,0%, Prime Cost 58,3%.

5. **Confira no Supabase** se o lead de teste salvou os novos campos numéricos certinho.

6. **Suba pro ar:**
   ```
   git add .
   git commit -m "feat: diagnostico com indicadores financeiros reais (CMV, custo de pessoal, Prime Cost)"
   git push
   ```

## Sobre as faixas de referência usadas

- CMV ideal por segmento: Bar 24–30% · Restaurante 28–34% · Café/Cafeteria 25–32% · Outro 28–35%
- Custo de pessoal ideal (geral): 25–35%
- Prime Cost saudável: até 60%

Essas faixas são referências gerais usadas em consultoria de food service, não uma verdade
absoluta — se o Eduardo quiser ajustar algum desses números com base na própria experiência de
consultoria, é só me passar os valores que eu atualizo direto no `causas.ts`.
