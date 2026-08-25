# Atualização v5 — Fundo com foto no Diagnóstico

## O que mudou

- O fundo azul sólido da página `/diagnostico` virou a foto que você enviou (mesa de bar,
  caderno, calculadora, café), com uma camada escura por cima pra manter o texto legível.
- Os painéis (formulário e resultado) continuam com fundo sólido escuro, então nada muda na
  leitura — só o espaço ao redor deles ganhou a foto.

## Passo a passo

1. **Pare o servidor** (Ctrl+C) se estiver rodando.

2. **Copie os arquivos com xcopy:**
   ```
   xcopy sig-diagnostico-v5\ C:\Users\User\Documents\sig-app\ /E /H /Y
   ```
   Isso vai colocar a imagem em `public\images\diagnostico-bg.jpg` e atualizar o `page.tsx`.
   Nenhuma migration, nenhuma mudança de API — só visual.

3. **Teste local:**
   ```
   npm run dev
   ```
   Abra `http://localhost:3000/diagnostico` e confirme que a foto aparece no fundo, escurecida,
   com o formulário e o texto continuando fáceis de ler.

4. **Suba pro ar:**
   ```
   git add .
   git commit -m "feat: fundo com foto na pagina de diagnostico"
   git push
   ```
