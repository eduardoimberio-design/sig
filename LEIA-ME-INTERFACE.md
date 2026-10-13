# Modulo 4: nova interface (home e /diagnostico)

Sem migration. Sem biblioteca nova.

## O que entra
- components/cabecalho-site.tsx (novo): cabecalho fixo com logo, menu, "Entrar" e o
  botao ambar "Faca um diagnostico gratuito". No celular vira menu de tres tracos.
- app/page.tsx: a home institucional que o site nao tinha.
- app/diagnostico/page.tsx: ganha o mesmo cabecalho. Video, copy e Joao intactos.
- public/images/logo-sig-claro.png e logo-sig-simbolo.png: sua logo com fundo
  transparente e os tracos marinho trocados por claro, para o fundo escuro.

## Filtro do hero
Sobreposicao UNIFORME sobre toda a foto: rgba(5,11,20,0.94). Para escurecer mais ou
menos, trocar os dois valores 0.94 em app/page.tsx (0.97 quase apaga a foto; 0.90
deixa a foto bem visivel).

## Decisoes registradas
- O ambar, antes so para valores monetarios, passa a valer para o botao principal.
- Nenhuma prova social inventada e nenhum preco na pagina (os valores vivem na
  tabela `planos`).
- A secao "O que o SIG nao faz" e proposital.

## Ainda nao ligado
"Conhecer o sistema" leva a secao O que faz; no modulo da degustacao passa a apontar
para a tela de degustacao.
