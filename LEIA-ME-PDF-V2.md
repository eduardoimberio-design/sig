# PDF v2 — mais dissertativo, com glossário

## O que mudou

**1. Glossário em linguagem simples**, logo depois dos indicadores: explica CMV,
Custo de pessoal e Prime Cost com frases do tipo "de cada R$ 100 que você fatura,
R$ 40 já foram usados só pra comprar o que foi vendido" — sem assumir que quem lê
sabe o que esses termos significam.

**2. Leitura financeira calculada em código**, não mais dependente só do resumo que
a IA fez durante a conversa. Isso segue o mesmo princípio do resto do projeto: contas
feitas em código são sempre confiáveis e completas; texto livre de IA pode variar de
qualidade conforme a conversa foi mais ou menos rica. Agora o PDF sempre traz:
- Quanto exatamente é gasto em insumos, em reais
- Quantos pontos percentuais acima (ou dentro) da faixa esperada
- Quanto isso representa em reais por mês
- A mesma leitura para custo de pessoal e Prime Cost

**3. Causa raiz e ação recomendada continuam** vindas da conversa (personalizadas,
usam as palavras que a pessoa disse) — mas agora como complemento à leitura técnica,
não como o único texto explicativo do documento.

**4. Paginação automática.** Com mais conteúdo, o diagnóstico pode passar de uma
página — o gerador agora cria página nova automaticamente quando necessário, e o
rodapé aparece em todas as páginas.

## Passo a passo

Nenhuma migration, nenhuma mudança de API — só o gerador de PDF.

```
xcopy sig-pdf-v2\ C:\Users\User\Documents\sig-app\ /E /H /Y
```

```
npm run dev
```

Teste em `localhost:3000/diagnostico` (ou pelo botão no admin) e confira se o PDF
saiu mais completo — com o glossário, a leitura financeira detalhada e ainda a causa
raiz e ação da conversa.

```
git add .
git commit -m "feat: PDF do diagnostico mais dissertativo, com glossario de termos financeiros"
git push
```
