# PDF do diagnóstico

## Como funciona

Depois de entregar o diagnóstico, o João pergunta se a pessoa quer o PDF. Se ela
aceitar, aparece um botão **"Baixar diagnóstico em PDF"** — o arquivo é gerado na
hora, no próprio navegador, e o lead compartilha por WhatsApp ou e-mail como preferir.

Sobre o envio automático: como combinamos, os envios ficam manuais por enquanto. O
sistema não envia e-mail nem WhatsApp sozinho — nenhum serviço de envio foi
configurado, e o WhatsApp dependeria da API oficial (Fase 2). O que existe é o
download imediato, que resolve o essencial sem depender de nada externo.

## O que o PDF contém

- Cabeçalho com a identidade do SIG e a data
- Nome do estabelecimento, tipo de negócio e cidade
- Os três indicadores em destaque (CMV, custo de pessoal, Prime Cost)
- Os números que a pessoa informou
- As faixas de referência do segmento dela — inclusive as específicas de delivery
- A causa mais provável e a ação recomendada
- Rodapé com seu contato

Segue a identidade visual do sistema: fundo navy, ciano na estrutura, âmbar nos
números. É um documento que a pessoa pode mostrar para um sócio sem constrangimento.

## Decisões técnicas que vale você saber

**O PDF é gerado no navegador**, não no servidor. Isso torna o download instantâneo,
não consome recurso da Vercel e não precisa de armazenamento de arquivos.

**Os dados vêm do mesmo extrator** que grava o lead. Assim o PDF mostra exatamente os
números que ficam registrados no seu painel — sem risco de o lead receber um número e
você ver outro.

**A biblioteca carrega sob demanda**, só quando alguém pede o arquivo. Não pesa o
carregamento do site para quem nunca vai baixar.

## Passo a passo

Nenhuma migration desta vez.

```
xcopy sig-pdf\ C:\Users\User\Documents\sig-app\ /E /H /Y
```

```
npm run dev
```

Faça uma conversa completa em `localhost:3000/diagnostico`. Quando o João entregar o
diagnóstico, ele deve oferecer o PDF — aceite e confira se o arquivo baixa e se os
números conferem com a conversa.

```
git add .
git commit -m "feat: PDF do diagnostico com download na conversa"
git push
```

## Ficou pendente: gerar o PDF pelo painel admin

Você mencionou querer enviar manualmente por e-mail e WhatsApp — para isso faz sentido
ter o mesmo botão de PDF na tela `/admin/diagnosticos`, ao lado de cada lead.

Não incluí neste pacote porque não tenho mais os arquivos dessa tela no meu ambiente
(foram criados em sessões anteriores). Se quiser essa parte, me mande o conteúdo de:
```
notepad "app\(admin)\admin\diagnosticos\cliente.tsx"
```
que eu preparo num pacote curto.
