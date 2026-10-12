# Vídeo na página do diagnóstico (12/10/2026)

Sem migration. Sem biblioteca nova. Aplicar depois dos pacotes anteriores.

## O que entra
- public/videos/diagnostico-sig.mp4 — o seu vídeo comprimido de 39,8 MB para 3,6 MB
  (720x1280, mesma duração e mesmo áudio). O original não vai para o site.
- public/images/diagnostico-video-poster.jpg — imagem de capa (47 KB).
- components/video-diagnostico.tsx — o player.
- app/diagnostico/page.tsx — o vídeo entra logo abaixo do título.

## Decisões embutidas
- O vídeo SÓ é baixado quando a pessoa clica (preload="none"). Quem não assiste não
  consome banda. Até o clique, carrega só a capa de 47 KB.
- Não toca sozinho: o João já abre sozinho nesta tela e os dois juntos disputariam
  atenção.
- Moldura escura e degradê sobre a capa, porque o vídeo tem fundo branco e a página
  é azul-marinho.

## Para trocar o vídeo depois
Substituir public/videos/diagnostico-sig.mp4 pelo novo arquivo (mesmo nome), comprimir
antes, e fazer git push. A capa fica em public/images/diagnostico-video-poster.jpg.
