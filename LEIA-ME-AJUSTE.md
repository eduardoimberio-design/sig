# Ajuste da citação + remoção dos nomes de metodologia

## O que mudou

1. **Citação corrigida** — tirei a redundância "minha própria" e o verbo estranho
   "coloquei em produto", e dei mais força de autoridade/especificidade à frase.
2. **Nomes de frameworks removidos** — "Diagrama de Ishikawa", "5 Porquês", "5W2H" e
   "Análise SWOT" não aparecem mais na página pública. Troquei por uma frase que mantém
   o tom de autoridade sem expor o método interno.

## Passo a passo

```
xcopy sig-copy-v2\ C:\Users\User\Documents\sig-app\ /E /H /Y
```

```
npm run dev
```

Confira em `http://localhost:3000/diagnostico` (seção "Por trás do diagnóstico") se a
citação nova e a ausência dos nomes de framework ficaram como esperado.

```
git add .
git commit -m "fix: corrige citacao e remove nomes de metodologia da pagina publica"
git push
```
