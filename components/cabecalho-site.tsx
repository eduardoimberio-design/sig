"use client";

// components/cabecalho-site.tsx
//
// O cabeçalho das páginas públicas (home e /diagnostico).
//
// Estrutura vinda do modelo aprovado: logo à esquerda, menu no centro, dois botões
// à direita — um contornado (secundário) e um sólido (a ação principal). No celular
// o menu vira um painel que abre pelo botão de três traços, e os dois botões descem
// para dentro dele, em largura cheia.
//
// Os links do menu apontam para "/#secao" e não para "#secao": assim funcionam
// também a partir da /diagnostico, onde essas seções não existem na página.
//
// Sobre a cor do botão principal: o âmbar era reservado para valores monetários na
// identidade. Aqui ele passa a valer também para a ação principal — é a única cor
// quente da paleta, e o modelo pedia um botão que salta. O ciano segue sendo a cor
// de interação em todo o resto do sistema, e o âmbar continua sendo o único usado
// em cifras, então não há ambiguidade dentro do painel.

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

const MENU = [
  { rotulo: "O que faz", href: "/#o-que-faz" },
  { rotulo: "Como funciona", href: "/#como-funciona" },
  { rotulo: "Para quem é", href: "/#para-quem" },
  { rotulo: "Contato", href: "/#contato" },
];

export function CabecalhoSite() {
  const [aberto, setAberto] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-[#050B14]/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
        <Link
          href="/"
          onClick={() => setAberto(false)}
          className="flex shrink-0 items-center gap-2.5"
          aria-label="SIG — página inicial"
        >
          <Image
            src="/images/logo-sig-simbolo.png"
            alt=""
            width={34}
            height={32}
            className="h-8 w-auto"
            priority
          />
          <span className="titulo text-lg font-bold leading-none">
            SIG<span className="text-cyan">.</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-7 lg:flex">
          {MENU.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm text-white/60 transition-colors hover:text-cyan"
            >
              {item.rotulo}
            </Link>
          ))}
        </nav>

        <div className="hidden shrink-0 items-center gap-3 lg:flex">
          <Link
            href="/login"
            className="rotulo border border-cyan/40 px-4 py-2 text-[11px] tracking-[0.14em]
                       text-cyan transition-colors hover:bg-cyan hover:text-base-bg"
          >
            Entrar
          </Link>
          <Link
            href="/diagnostico"
            className="rotulo bg-ambar px-4 py-2 text-[11px] font-semibold tracking-[0.14em]
                       text-[#050B14] transition-opacity hover:opacity-85"
          >
            Faça um diagnóstico gratuito
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setAberto((v) => !v)}
          aria-label={aberto ? "Fechar menu" : "Abrir menu"}
          aria-expanded={aberto}
          className="p-2 text-white/70 transition-colors hover:text-cyan lg:hidden"
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
            {aberto ? (
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            ) : (
              <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
            )}
          </svg>
        </button>
      </div>

      {aberto && (
        <div className="border-t border-white/10 bg-[#050B14] px-6 py-5 lg:hidden">
          <nav className="flex flex-col gap-1">
            {MENU.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setAberto(false)}
                className="py-2.5 text-[15px] text-white/70 transition-colors hover:text-cyan"
              >
                {item.rotulo}
              </Link>
            ))}
          </nav>

          <div className="mt-5 flex flex-col gap-3">
            <Link
              href="/diagnostico"
              onClick={() => setAberto(false)}
              className="rotulo bg-ambar px-4 py-3 text-center text-[11px] font-semibold
                         tracking-[0.14em] text-[#050B14]"
            >
              Faça um diagnóstico gratuito
            </Link>
            <Link
              href="/login"
              onClick={() => setAberto(false)}
              className="rotulo border border-cyan/40 px-4 py-3 text-center text-[11px]
                         tracking-[0.14em] text-cyan"
            >
              Entrar
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
