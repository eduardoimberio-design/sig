"use client";

// components/video-diagnostico.tsx
//
// O vídeo de apresentação na página /diagnostico.
//
// Três decisões que explicam o formato deste componente:
//
// 1. preload="none": o arquivo (3,6 MB) só é baixado quando a pessoa clica em
//    assistir. Quem passa pela página sem assistir não consome banda nenhuma —
//    o que importa no plano Hobby da Vercel, onde estourar a cota derruba o site
//    inteiro, não só o vídeo. Até o clique, só a imagem de capa (47 KB) é carregada.
//
// 2. Não toca sozinho: o João abre sozinho nesta tela, em ~0,6 s. Um vídeo
//    começando ao mesmo tempo disputaria atenção com a conversa, que é o que
//    converte. Quem quiser assistir, assiste.
//
// 3. O vídeo é vertical (9:16) e tem fundo claro, porque foi produzido para
//    redes sociais. A moldura escura e o degradê sobre a capa existem para que
//    ele não brigue com o fundo azul-marinho da página.

import { useRef, useState } from "react";

export function VideoDiagnostico() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [tocando, setTocando] = useState(false);

  function assistir() {
    const video = videoRef.current;
    if (!video) return;
    // play() devolve uma promessa que pode ser rejeitada (aba em segundo plano,
    // política do navegador). Ignorar a rejeição evita erro no console sem
    // mudar o que a pessoa vê: ela simplesmente clica de novo.
    void video.play().catch(() => setTocando(false));
    setTocando(true);
  }

  return (
    <div className="mb-12 flex flex-col items-center">
      <div
        className="relative w-full max-w-[300px] overflow-hidden rounded-sm
                   border border-cyan/25 bg-[#050B14]"
      >
        <video
          ref={videoRef}
          src="/videos/diagnostico-sig.mp4"
          poster="/images/diagnostico-video-poster.jpg"
          preload="none"
          playsInline
          controls={tocando}
          onEnded={() => setTocando(false)}
          onPause={() => videoRef.current?.ended && setTocando(false)}
          className="block w-full"
          style={{ aspectRatio: "9 / 16" }}
        />

        {!tocando && (
          <button
            type="button"
            onClick={assistir}
            aria-label="Assistir ao vídeo de apresentação"
            className="group absolute inset-0 flex flex-col items-center justify-center
                       bg-gradient-to-b from-[#050B14]/55 via-[#050B14]/25 to-[#050B14]/75
                       transition-colors hover:from-[#050B14]/45 hover:to-[#050B14]/70"
          >
            <span
              className="flex h-16 w-16 items-center justify-center rounded-full
                         border border-cyan/60 bg-[#050B14]/70 text-cyan
                         transition-colors group-hover:bg-cyan group-hover:text-[#050B14]"
            >
              {/* Triângulo de "tocar", desenhado em SVG para não depender de fonte. */}
              <svg viewBox="0 0 24 24" className="ml-1 h-6 w-6" fill="currentColor" aria-hidden="true">
                <path d="M8 5v14l11-7z" />
              </svg>
            </span>
            <span className="rotulo mt-4 text-[11px] tracking-[0.14em] text-white/70">
              Assistir · 1 minuto
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
