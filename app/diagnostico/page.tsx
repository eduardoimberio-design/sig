"use client";

// app/diagnostico/page.tsx
//
// v6 — copy reformulada (gancho de curiosidade + agitação do problema +
// autoridade + antecipação do resultado), estrutura de dados e cálculo
// idênticos à v5. Nenhuma mudança de schema, API ou lógica de diagnóstico.

import { useState, type FormEvent } from "react";

type Etapa = "formulario" | "enviando" | "resultado" | "erro";

const TIPOS_NEGOCIO = ["Bar", "Restaurante", "Café / Cafeteria", "Outro"] as const;
const PREOCUPACOES = [
  "Custo de insumos subindo mais rápido do que consigo repassar",
  "Ticket médio abaixo do que eu gostaria",
  "Não sei exatamente onde estou perdendo dinheiro",
  "Equipe e rotina de trabalho desorganizadas",
] as const;
const CONSULTOR_24H = ["Sim, com certeza", "Provavelmente sim", "Não tenho certeza", "Não acredito"] as const;

const URL_CADASTRO = "https://sig-fsi.com.br/cadastro";

interface Indicadores {
  cmvPercentual: number;
  custoPessoalPercentual: number;
  primeCostPercentual: number;
  margemEstimada: number;
}

interface Resultado {
  indicadores: Indicadores;
  leituraFinanceira: string;
  causaRaiz: string;
  acaoRecomendada: string;
  linkWhatsapp: string;
}

function fmtPct(valor: number) {
  return valor.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + "%";
}

export default function DiagnosticoPage() {
  const [etapa, setEtapa] = useState<Etapa>("formulario");
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [erroMsg, setErroMsg] = useState<string>("");

  const [nome, setNome] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [tipoNegocio, setTipoNegocio] = useState<(typeof TIPOS_NEGOCIO)[number] | "">("");
  const [faturamentoMensal, setFaturamentoMensal] = useState("");
  const [comprasMensal, setComprasMensal] = useState("");
  const [custoFuncionariosMensal, setCustoFuncionariosMensal] = useState("");
  const [maiorPreocupacao, setMaiorPreocupacao] = useState<(typeof PREOCUPACOES)[number] | "">("");
  const [desafioLivre, setDesafioLivre] = useState("");
  const [acreditaConsultor24h, setAcreditaConsultor24h] = useState<(typeof CONSULTOR_24H)[number] | "">("");
  const [aceite, setAceite] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (
      !tipoNegocio ||
      !faturamentoMensal ||
      !comprasMensal ||
      !custoFuncionariosMensal ||
      !maiorPreocupacao ||
      !acreditaConsultor24h ||
      !aceite
    )
      return;

    setEtapa("enviando");
    setErroMsg("");

    try {
      const resp = await fetch("/api/diagnostico", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome,
          whatsapp,
          tipoNegocio,
          faturamentoMensal: Number(faturamentoMensal),
          comprasMensal: Number(comprasMensal),
          custoFuncionariosMensal: Number(custoFuncionariosMensal),
          maiorPreocupacao,
          desafioLivre,
          acreditaConsultor24h,
          consentimentoLgpd: aceite,
          origem: typeof window !== "undefined" ? window.location.search || undefined : undefined,
        }),
      });

      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error(data?.error ?? "Não foi possível gerar o diagnóstico");
      }

      const data: Resultado = await resp.json();
      setResultado(data);
      setEtapa("resultado");
    } catch (err) {
      setErroMsg(err instanceof Error ? err.message : "Erro inesperado");
      setEtapa("erro");
    }
  }

  function irParaFormulario() {
    document.getElementById("formulario-diagnostico")?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <main
      className="text-[#E8EEF3] min-h-screen"
      style={{
        backgroundImage:
          "linear-gradient(rgba(5,11,20,0.90), rgba(5,11,20,0.96)), url('/images/diagnostico-bg.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div className="max-w-3xl mx-auto px-6 py-16">
        <header className="mb-10 flex items-center justify-between">
          <div style={{ fontFamily: "Space Grotesk, sans-serif" }} className="font-bold text-lg">
            SIG<span className="text-[#4EC5DC]">.</span>
          </div>
          <div
            style={{ fontFamily: "IBM Plex Mono, monospace" }}
            className="text-[11px] text-[#8FA3B3] border border-[#4EC5DC]/20 rounded-sm px-3 py-1.5"
          >
            SISTEMA INTELIGENTE DE GESTÃO
          </div>
        </header>

        {etapa !== "resultado" && (
          <>
            {/* HERO — gancho de curiosidade */}
            <span
              style={{ fontFamily: "IBM Plex Mono, monospace" }}
              className="block text-[11px] tracking-[0.14em] uppercase text-[#4EC5DC] mb-4"
            >
              Diagnóstico gratuito · 3 minutos
            </span>
            <h1
              style={{ fontFamily: "Space Grotesk, sans-serif" }}
              className="text-3xl sm:text-4xl font-bold leading-tight mb-4"
            >
              Existe um número dentro do seu negócio que decide se{" "}
              <span className="text-[#4EC5DC]">sobra lucro</span> no fim do mês.
              Você já calculou ele?
            </h1>
            <p className="text-[#8FA3B3] mb-6 max-w-lg text-[15px] leading-relaxed">
              Não é sobre vender mais. É sobre parar de perder dinheiro sem saber onde.
              Em 3 minutos, com números reais da sua operação, você descobre exatamente
              o que está pesando contra o seu caixa — com a mesma lente que eu uso em
              consultoria presencial.
            </p>
            <button
              onClick={irParaFormulario}
              style={{ fontFamily: "Space Grotesk, sans-serif" }}
              className="inline-flex items-center gap-2 bg-[#4EC5DC] text-[#04121A] font-bold text-[15px] px-7 py-4 rounded-sm hover:-translate-y-0.5 transition-transform mb-16"
            >
              Descobrir meu número →
            </button>

            {/* PROBLEMA — agitação (PAS) */}
            <span
              style={{ fontFamily: "IBM Plex Mono, monospace" }}
              className="block text-[11px] tracking-[0.14em] uppercase text-[#D9A94C] mb-4"
            >
              O que ninguém te conta
            </span>
            <h2
              style={{ fontFamily: "Space Grotesk, sans-serif" }}
              className="text-2xl font-bold leading-snug mb-4 max-w-lg"
            >
              Fechar o caixa "bem" não significa que está indo bem
            </h2>
            <p className="text-[#8FA3B3] mb-16 max-w-lg text-[15px] leading-relaxed">
              A maioria dos negócios de alimentação não afunda por falta de cliente —
              afunda porque o dono decide o tempo todo (preço, cardápio, escala de
              equipe) sem nenhum número real na mão. E o pior: o problema não aparece
              de uma vez. Ele se acumula mês a mês, silenciosamente, até virar uma bola
              de neve que ninguém viu crescer.
            </p>

            {/* AUTORIDADE — reforço de credibilidade real, sem números inventados */}
            <span
              style={{ fontFamily: "IBM Plex Mono, monospace" }}
              className="block text-[11px] tracking-[0.14em] uppercase text-[#4EC5DC] mb-4"
            >
              Por trás do diagnóstico
            </span>
            <h2
              style={{ fontFamily: "Space Grotesk, sans-serif" }}
              className="text-2xl font-bold leading-snug mb-4 max-w-lg"
            >
              O mesmo raciocínio da consultoria presencial — só que em 3 minutos
            </h2>
            <blockquote
              style={{ fontFamily: "Space Grotesk, sans-serif" }}
              className="border-l-2 border-[#4EC5DC] pl-5 text-lg leading-relaxed mb-4 max-w-lg"
            >
              "Depois de anos como consultor de bares e restaurantes, transformei em
              produto o mesmo raciocínio que uso presencialmente para encontrar a
              causa raiz dos problemas — só que agora ele roda todo dia, não uma vez
              por mês."
            </blockquote>
            <p
              style={{ fontFamily: "IBM Plex Mono, monospace" }}
              className="text-[12px] text-[#8FA3B3] mb-6"
            >
              EDUARDO IMBERIO — Consultor de food service, criador do SIG
            </p>
            <p className="text-[#8FA3B3] mb-16 max-w-lg text-[15px] leading-relaxed">
              Métodos de consultoria profissional aplicados todos os dias, não só uma
              vez por mês.
            </p>

            {/* ANTECIPAÇÃO — o que o diagnóstico revela, gera curiosidade pelo resultado */}
            <div className="border border-[#D9A94C]/30 bg-[#D9A94C]/[0.04] rounded-sm p-6 mb-10">
              <span
                style={{ fontFamily: "IBM Plex Mono, monospace" }}
                className="block text-[11px] tracking-[0.14em] uppercase text-[#D9A94C] mb-4"
              >
                Em 3 minutos você vai descobrir
              </span>
              <ul className="space-y-3">
                {[
                  "Se o seu CMV está dentro, acima ou abaixo do saudável pro seu segmento",
                  "Se o custo com a sua equipe está puxando a margem pra baixo",
                  "O Prime Cost do seu negócio — o número que a maioria nunca calculou, mas que decide se sobra lucro",
                  "A causa mais provável de onde você está perdendo dinheiro, e o que fazer sobre isso essa semana",
                ].map((item) => (
                  <li key={item} className="flex gap-3 text-[15px] leading-relaxed">
                    <span className="text-[#D9A94C] shrink-0">→</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}

        {etapa === "resultado" && resultado && (
          <div className="border border-[#4EC5DC]/20 bg-[#0A1420] rounded-sm p-6 sm:p-8">
            <span
              style={{ fontFamily: "IBM Plex Mono, monospace" }}
              className="block text-[11px] tracking-[0.14em] uppercase text-[#D9A94C] mb-4"
            >
              Diagnóstico financeiro
            </span>

            <h2 style={{ fontFamily: "Space Grotesk, sans-serif" }} className="text-2xl font-bold mb-6">
              {nome}, aqui está a leitura do seu negócio:
            </h2>

            <div className="grid grid-cols-3 gap-3 mb-7">
              <Indicador label="CMV" valor={fmtPct(resultado.indicadores.cmvPercentual)} />
              <Indicador label="Custo de pessoal" valor={fmtPct(resultado.indicadores.custoPessoalPercentual)} />
              <Indicador label="Prime Cost" valor={fmtPct(resultado.indicadores.primeCostPercentual)} destaque />
            </div>

            <Bloco titulo="Leitura financeira" texto={resultado.leituraFinanceira} cor="#4EC5DC" />
            <Bloco titulo="Causa raiz provável" texto={resultado.causaRaiz} cor="#D9A94C" />
            <Bloco titulo="Ação recomendada" texto={resultado.acaoRecomendada} cor="#4EC5DC" ultimo />

            <p className="text-[#8FA3B3] text-sm mb-6">
              Essa é uma leitura inicial, com base nos números que você informou. O SIG faz esse
              tipo de acompanhamento todo dia, automaticamente, dentro do seu negócio.
            </p>

            <div className="grid sm:grid-cols-2 gap-3">
              <a
                href={URL_CADASTRO}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontFamily: "Space Grotesk, sans-serif" }}
                className="flex flex-col items-start gap-1 bg-[#D9A94C] text-[#04121A] font-bold text-[15px] px-6 py-4 rounded-sm hover:-translate-y-0.5 transition-transform"
              >
                <span>Quero contratar o SIG agora →</span>
                <span
                  style={{ fontFamily: "IBM Plex Mono, monospace" }}
                  className="text-[11px] font-normal opacity-80"
                >
                  Já sei que preciso disso no meu dia a dia
                </span>
              </a>

              <a
                href={resultado.linkWhatsapp}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontFamily: "Space Grotesk, sans-serif" }}
                className="flex flex-col items-start gap-1 bg-transparent border border-[#4EC5DC] text-[#4EC5DC] font-bold text-[15px] px-6 py-4 rounded-sm hover:-translate-y-0.5 transition-transform"
              >
                <span>Prefiro falar com o consultor antes →</span>
                <span
                  style={{ fontFamily: "IBM Plex Mono, monospace" }}
                  className="text-[11px] font-normal opacity-80"
                >
                  Sessão estratégica gratuita de 20 minutos
                </span>
              </a>
            </div>
          </div>
        )}

        {etapa !== "resultado" && (
          <form
            id="formulario-diagnostico"
            onSubmit={handleSubmit}
            className="bg-[#0D1826] border border-[#4EC5DC]/20 rounded-sm p-6 sm:p-8 scroll-mt-8"
          >
            <span
              style={{ fontFamily: "IBM Plex Mono, monospace" }}
              className="block text-[11px] tracking-[0.14em] uppercase text-[#4EC5DC] mb-1"
            >
              Vamos ao seu diagnóstico
            </span>
            <p className="text-[#8FA3B3] text-sm mb-6">
              Números aproximados já bastam — o objetivo aqui é clareza, não precisão contábil.
            </p>

            <Campo label="Seu nome">
              <input
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Como podemos te chamar"
                className={inputClass}
              />
            </Campo>

            <Campo label="WhatsApp">
              <input
                required
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="(11) 90000-0000"
                className={inputClass}
              />
            </Campo>

            <div className="h-px bg-[#4EC5DC]/10 my-6" />

            <Campo numero="1" label="Qual o tipo do seu negócio?">
              <select
                required
                value={tipoNegocio}
                onChange={(e) => setTipoNegocio(e.target.value as typeof tipoNegocio)}
                className={inputClass}
              >
                <option value="" disabled>Selecione</option>
                {TIPOS_NEGOCIO.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </Campo>

            <Campo numero="2" label="Faturamento médio mensal aproximado (R$)">
              <input
                required
                type="number"
                min={1}
                inputMode="decimal"
                value={faturamentoMensal}
                onChange={(e) => setFaturamentoMensal(e.target.value)}
                placeholder="Ex.: 60000"
                className={inputClass}
              />
            </Campo>

            <Campo numero="3" label="Gasto mensal aproximado com compras/insumos (R$)">
              <input
                required
                type="number"
                min={0}
                inputMode="decimal"
                value={comprasMensal}
                onChange={(e) => setComprasMensal(e.target.value)}
                placeholder="Ex.: 20000"
                className={inputClass}
              />
            </Campo>

            <Campo numero="4" label="Gasto mensal aproximado com equipe (salários + encargos) (R$)">
              <input
                required
                type="number"
                min={0}
                inputMode="decimal"
                value={custoFuncionariosMensal}
                onChange={(e) => setCustoFuncionariosMensal(e.target.value)}
                placeholder="Ex.: 15000"
                className={inputClass}
              />
            </Campo>

            <Campo numero="5" label="Qual desses pontos mais te preocupa hoje no seu negócio?">
              <select
                required
                value={maiorPreocupacao}
                onChange={(e) => setMaiorPreocupacao(e.target.value as typeof maiorPreocupacao)}
                className={inputClass}
              >
                <option value="" disabled>Selecione</option>
                {PREOCUPACOES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </Campo>

            <Campo numero="6" label="Em poucas palavras, qual é o maior desafio ou dúvida que você tem hoje na gestão do seu negócio?">
              <textarea
                value={desafioLivre}
                onChange={(e) => setDesafioLivre(e.target.value)}
                placeholder="Escreva com suas próprias palavras..."
                rows={3}
                maxLength={600}
                className={inputClass}
              />
            </Campo>

            <div className="border border-[#D9A94C]/30 bg-[#D9A94C]/[0.04] rounded-sm p-4 mb-6">
              <Campo
                numero="7"
                label="Você acredita que ter um consultor virtual disponível 24 horas por dia ajudaria a mudar esse quadro no seu negócio?"
              >
                <select
                  required
                  value={acreditaConsultor24h}
                  onChange={(e) => setAcreditaConsultor24h(e.target.value as typeof acreditaConsultor24h)}
                  className={inputClass}
                >
                  <option value="" disabled>Selecione</option>
                  {CONSULTOR_24H.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </Campo>
            </div>

            <label className="flex items-start gap-2.5 text-xs text-[#8FA3B3] mb-6">
              <input
                type="checkbox"
                checked={aceite}
                onChange={(e) => setAceite(e.target.checked)}
                className="mt-0.5"
                required
              />
              <span>
                Autorizo o contato via WhatsApp com o resultado do meu diagnóstico e concordo com o
                uso dos meus dados apenas para essa finalidade, conforme a LGPD.
              </span>
            </label>

            {etapa === "erro" && (
              <p className="text-sm text-[#E4756B] mb-4">{erroMsg}</p>
            )}

            <button
              type="submit"
              disabled={etapa === "enviando"}
              style={{ fontFamily: "Space Grotesk, sans-serif" }}
              className="w-full bg-[#4EC5DC] text-[#04121A] font-bold text-[15px] px-7 py-4 rounded-sm disabled:opacity-60"
            >
              {etapa === "enviando" ? "Calculando seus indicadores..." : "Ver meu diagnóstico →"}
            </button>
          </form>
        )}

        <footer
          style={{ fontFamily: "IBM Plex Mono, monospace" }}
          className="mt-14 pt-6 border-t border-[#4EC5DC]/15 text-xs text-[#8FA3B3] flex justify-between flex-wrap gap-3"
        >
          <span>SIG — Sistema Inteligente de Gestão</span>
          <span>WhatsApp: +55 11 98550-3734</span>
        </footer>
      </div>
    </main>
  );
}

const inputClass =
  "w-full bg-[#0A1420] border border-[#4EC5DC]/20 text-[#E8EEF3] text-[15px] px-3.5 py-3 rounded-sm outline-none focus:border-[#4EC5DC] resize-none";

function Campo({
  label,
  numero,
  children,
}: {
  label: string;
  numero?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4">
      <label
        style={{ fontFamily: "IBM Plex Mono, monospace" }}
        className="block text-xs text-[#8FA3B3] mb-2"
      >
        {numero && <span className="text-[#4EC5DC] mr-1.5">{numero}.</span>}
        {label}
      </label>
      {children}
    </div>
  );
}

function Indicador({ label, valor, destaque }: { label: string; valor: string; destaque?: boolean }) {
  return (
    <div
      className={`border rounded-sm p-3 text-center ${
        destaque ? "border-[#D9A94C]/40 bg-[#D9A94C]/[0.05]" : "border-[#4EC5DC]/20 bg-[#050B14]"
      }`}
    >
      <div
        style={{ fontFamily: "IBM Plex Mono, monospace" }}
        className="text-[10px] text-[#8FA3B3] uppercase tracking-wide mb-1"
      >
        {label}
      </div>
      <div
        style={{ fontFamily: "Space Grotesk, sans-serif" }}
        className={`text-lg font-bold ${destaque ? "text-[#D9A94C]" : "text-[#4EC5DC]"}`}
      >
        {valor}
      </div>
    </div>
  );
}

function Bloco({
  titulo,
  texto,
  cor,
  ultimo,
}: {
  titulo: string;
  texto: string;
  cor: string;
  ultimo?: boolean;
}) {
  return (
    <div className={ultimo ? "mb-8" : "mb-6"}>
      <p
        style={{ fontFamily: "IBM Plex Mono, monospace", color: cor }}
        className="text-[11px] mb-2 uppercase tracking-wide"
      >
        {titulo}
      </p>
      <p className="text-[15px] leading-relaxed">{texto}</p>
    </div>
  );
}
