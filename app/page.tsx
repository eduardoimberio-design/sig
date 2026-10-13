// app/page.tsx
//
// A home institucional. Antes esta página era só um cartão com o nome SIG e um
// botão "Acessar painel" — quem chegava pelo domínio não tinha o que ler.
//
// A estrutura segue o modelo aprovado: cabeçalho fixo, hero de largura cheia com
// foto e sobreposição, título grande, texto de apoio e dois botões — o principal
// em âmbar, o secundário contornado. Depois do hero, as seções que o menu aponta.
//
// REGRA SEGUIDA AQUI: nada de prova social inventada. Nenhum "mais de X clientes",
// nenhum depoimento, nenhum percentual de economia. Quando houver cliente com
// resultado real, essa seção entra — e aí vale mais do que qualquer número agora.
//
// Preço também não aparece: os valores vivem na tabela `planos` e mudam. Escrever
// aqui criaria duas fontes da verdade, e uma delas ficaria desatualizada.

import Image from "next/image";
import Link from "next/link";
import { CabecalhoSite } from "@/components/cabecalho-site";

export const metadata = {
  title: "SIG — Food Service Intelligence",
  description:
    "Sistema de gestão para bares, restaurantes e delivery: financeiro, estoque, ficha técnica e equipe em um lugar só, com agentes de IA que leem os números e dizem o que fazer.",
};

const MODULOS = [
  {
    nome: "Financeiro",
    texto:
      "DRE, fluxo de caixa, contas a pagar e a receber, e a evolução de CMV, pessoal e Prime Cost nos últimos seis meses.",
  },
  {
    nome: "Estoque e ficha técnica",
    texto:
      "Insumos, produtos e ficha técnica com o CMV de cada prato. A nota fiscal entra por XML e atualiza o custo — você confere em vez de digitar.",
  },
  {
    nome: "Equipe",
    texto: "Escala, ausências e treinamentos, com o custo de pessoal ligado ao faturamento.",
  },
  {
    nome: "Consultor e Conselheiro",
    texto:
      "Relatório por período e diagnóstico de problema ou decisão, usando o método de consultoria por trás do sistema.",
  },
  {
    nome: "Marketing",
    texto: "Geração de conteúdo para as redes do seu negócio, a partir do que você já tem no sistema.",
  },
  {
    nome: "Métricas",
    texto: "Relatórios em Excel e PDF, para levar à reunião com o sócio ou ao contador.",
  },
];

const PASSOS = [
  {
    numero: "01",
    titulo: "Você lança o que já acontece",
    texto:
      "Nota fiscal, faturamento do período e custos. O XML entra exato; PDF e foto passam por leitura com conferência linha a linha antes de virar lançamento.",
  },
  {
    numero: "02",
    titulo: "O sistema calcula, não estima",
    texto:
      "CMV, custo de pessoal, Prime Cost e margem saem de conta feita sobre os seus números. Quando um dado não existe, o sistema diz isso em vez de inventar.",
  },
  {
    numero: "03",
    titulo: "Os agentes leem e recomendam",
    texto:
      "A partir dos números já calculados, os agentes apontam onde está o problema e o que fazer primeiro. A IA interpreta — ela nunca é quem faz a conta.",
  },
];

const NAO_FAZ = [
  "Emitir nota fiscal",
  "Integrar com PDV, iFood ou maquininha",
  "Registrar venda por prato",
  "Falar com o seu cliente final por WhatsApp",
  "Folha de pagamento",
  "Controle de mesas e comandas",
];

export default function HomePage() {
  return (
    <>
      <CabecalhoSite />

      <main>
        {/* HERO */}
        <section className="relative overflow-hidden border-b border-white/10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "linear-gradient(rgba(5,11,20,0.94), rgba(5,11,20,0.94)), url('/images/diagnostico-bg.jpg')",
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
            aria-hidden="true"
          />

          <div className="relative mx-auto max-w-6xl px-6 py-20 sm:py-28 lg:pr-[26rem]">
            <span className="rotulo mb-5 block text-[11px] tracking-[0.18em] text-cyan">
              Food Service Intelligence
            </span>

            <h1 className="titulo max-w-3xl text-4xl font-bold leading-[1.1] sm:text-5xl lg:text-6xl">
              Gestão de food service com <span className="text-cyan">número real</span>.
              Todo dia, não uma vez por mês.
            </h1>

            <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-white/60 sm:text-base">
              O SIG reúne financeiro, estoque, ficha técnica e equipe em um sistema só —
              e tem agentes que leem esses números e dizem o que fazer. Comece pelo
              diagnóstico gratuito: em 3 minutos você vê o CMV, o custo de equipe e o
              Prime Cost do seu negócio.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/diagnostico"
                className="rotulo bg-ambar px-6 py-3.5 text-center text-[12px] font-semibold
                           tracking-[0.14em] text-[#050B14] transition-opacity hover:opacity-85"
              >
                Faça um diagnóstico gratuito
              </Link>
              <Link
                href="#o-que-faz"
                className="rotulo border border-white/25 px-6 py-3.5 text-center text-[12px]
                           tracking-[0.14em] text-white/80 transition-colors
                           hover:border-cyan hover:text-cyan"
              >
                Conhecer o sistema →
              </Link>
            </div>

            <p className="mt-6 text-[13px] text-white/35">
              Gratuito, sem cadastro e sem instalar nada.
            </p>
          </div>
        </section>

        {/* O QUE FAZ */}
        <section id="o-que-faz" className="scroll-mt-20 border-b border-white/10 bg-[#050B14]/94">
          <div className="mx-auto max-w-6xl px-6 py-20 lg:pr-[26rem]">
            <span className="rotulo mb-4 block text-[11px] tracking-[0.18em] text-cyan">
              O que faz
            </span>
            <h2 className="titulo mb-4 max-w-2xl text-2xl font-bold leading-snug sm:text-3xl">
              Um sistema só, no lugar de cinco planilhas que ninguém atualiza
            </h2>
            <p className="mb-12 max-w-xl text-[15px] leading-relaxed text-white/55">
              Cada módulo alimenta o outro: a nota que entra no estoque vira despesa no
              financeiro, e o custo da ficha técnica aparece no CMV do prato.
            </p>

            <div className="grid gap-5 sm:grid-cols-2">
              {MODULOS.map((m) => (
                <div key={m.nome} className="painel px-6 py-6">
                  <h3 className="titulo mb-2.5 text-base font-bold text-cyan">{m.nome}</h3>
                  <p className="text-[14px] leading-relaxed text-white/60">{m.texto}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* COMO FUNCIONA */}
        <section id="como-funciona" className="scroll-mt-20 border-b border-white/10 bg-[#050B14]/94">
          <div className="mx-auto max-w-6xl px-6 py-20 lg:pr-[26rem]">
            <span className="rotulo mb-4 block text-[11px] tracking-[0.18em] text-ambar">
              Como funciona
            </span>
            <h2 className="titulo mb-12 max-w-2xl text-2xl font-bold leading-snug sm:text-3xl">
              A IA interpreta. Quem faz a conta é o sistema.
            </h2>

            <div className="grid gap-8 sm:grid-cols-3">
              {PASSOS.map((p) => (
                <div key={p.numero}>
                  <span className="cifra block text-3xl font-bold text-ambar">{p.numero}</span>
                  <div className="regua my-4 w-10" />
                  <h3 className="titulo mb-2.5 text-base font-bold">{p.titulo}</h3>
                  <p className="text-[14px] leading-relaxed text-white/55">{p.texto}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PARA QUEM É */}
        <section id="para-quem" className="scroll-mt-20 border-b border-white/10 bg-[#050B14]/94">
          <div className="mx-auto max-w-6xl px-6 py-20 lg:pr-[26rem]">
            <span className="rotulo mb-4 block text-[11px] tracking-[0.18em] text-cyan">
              Para quem é
            </span>
            <h2 className="titulo mb-4 max-w-2xl text-2xl font-bold leading-snug sm:text-3xl">
              Bar, restaurante, cafeteria, pizzaria e delivery
            </h2>
            <p className="mb-10 max-w-xl text-[15px] leading-relaxed text-white/55">
              Feito para o dono que decide preço, cardápio e escala — e hoje decide sem
              número na mão. O sistema precisa que alguém lance os dados: ele organiza,
              calcula e interpreta, mas não adivinha o que não foi informado.
            </p>

            <div className="painel px-6 py-7 sm:px-8">
              <span className="rotulo mb-5 block text-[11px] tracking-[0.18em] text-alerta">
                O que o SIG não faz
              </span>
              <ul className="grid gap-3 sm:grid-cols-2">
                {NAO_FAZ.map((item) => (
                  <li key={item} className="flex gap-3 text-[14px] leading-relaxed text-white/55">
                    <span className="shrink-0 text-white/25">—</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-6 text-[13px] leading-relaxed text-white/35">
                Está aqui porque descobrir isso depois de assinar é pior do que descobrir agora.
              </p>
            </div>
          </div>
        </section>

        {/* CONTATO */}
        <section id="contato" className="scroll-mt-20 bg-[#050B14]/94">
          <div className="mx-auto max-w-6xl px-6 py-20 lg:pr-[26rem]">
            <div className="painel px-7 py-10 sm:px-10">
              <span className="rotulo mb-4 block text-[11px] tracking-[0.18em] text-ambar">
                Por onde começar
              </span>
              <h2 className="titulo mb-4 max-w-xl text-2xl font-bold leading-snug sm:text-3xl">
                Comece vendo os seus próprios números
              </h2>
              <p className="mb-8 max-w-lg text-[15px] leading-relaxed text-white/55">
                O diagnóstico leva 3 minutos e é uma conversa, não um formulário. No fim
                você recebe o CMV, o custo de pessoal e o Prime Cost do seu negócio,
                comparados com a referência do seu segmento, em um PDF para guardar.
              </p>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  href="/diagnostico"
                  className="rotulo bg-ambar px-6 py-3.5 text-center text-[12px] font-semibold
                             tracking-[0.14em] text-[#050B14] transition-opacity hover:opacity-85"
                >
                  Faça um diagnóstico gratuito
                </Link>
                <a
                  href="https://wa.me/5511985503734"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rotulo border border-cyan/40 px-6 py-3.5 text-center text-[12px]
                             tracking-[0.14em] text-cyan transition-colors
                             hover:bg-cyan hover:text-base-bg"
                >
                  Falar no WhatsApp
                </a>
              </div>
            </div>
          </div>
        </section>

        <footer className="border-t border-white/10 bg-[#050B14]/94">
          <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10 sm:flex-row sm:items-center sm:justify-between lg:pr-[26rem]">
            <Image
              src="/images/logo-sig-claro.png"
              alt="SIG — Food Service Intelligence"
              width={110}
              height={144}
              className="h-16 w-auto opacity-70"
            />
            <div className="text-[13px] leading-relaxed text-white/35">
              <p>Eduardo Imberio — Consultoria para Food Service</p>
              <p className="mt-1">
                WhatsApp +55 11 98550-3734 ·{" "}
                <Link href="/login" className="text-cyan/70 hover:text-cyan">
                  Entrar no painel
                </Link>
              </p>
            </div>
          </div>
        </footer>
      </main>
    </>
  );
}
