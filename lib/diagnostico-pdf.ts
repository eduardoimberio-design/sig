// lib/diagnostico-pdf.ts
//
// Gera o PDF do diagnóstico. Roda no navegador (jsPDF), não no servidor — assim o
// download é imediato, não consome recurso da Vercel e não precisa de armazenamento.
//
// A identidade visual segue a do sistema: fundo navy, ciano para estrutura e âmbar
// para os números. Um diagnóstico que a pessoa vai guardar (e possivelmente mostrar
// para um sócio) precisa parecer um documento, não um recibo.

import { jsPDF } from "jspdf";

export interface DadosDiagnosticoPdf {
  nome: string | null;
  estabelecimento: string | null;
  cidade: string | null;
  tipoNegocio: string | null;
  faturamentoMensal: number | null;
  comprasMensal: number | null;
  custoFuncionariosMensal: number | null;
  cmvPercentual: number | null;
  custoPessoalPercentual: number | null;
  primeCostPercentual: number | null;
  causaRaiz: string | null;
  acaoRecomendada: string | null;
}

const NAVY: [number, number, number] = [5, 11, 20];
const NAVY_CLARO: [number, number, number] = [13, 24, 38];
const CIANO: [number, number, number] = [78, 197, 220];
const AMBAR: [number, number, number] = [217, 169, 76];
const BRANCO: [number, number, number] = [232, 238, 243];
const CINZA: [number, number, number] = [143, 163, 179];

const LARGURA = 210;
const ALTURA = 297;
const MARGEM = 20;
const UTIL = LARGURA - MARGEM * 2;

function moeda(valor: number | null): string {
  if (valor === null) return "—";
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

function pct(valor: number | null): string {
  if (valor === null) return "—";
  return valor.toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + "%";
}

/** Faixa de referência de CMV por tipo de negócio, para o PDF mostrar a comparação. */
function faixaCmv(tipo: string | null): { min: number; max: number } {
  switch (tipo) {
    case "Bar":
      return { min: 24, max: 30 };
    case "Café / Cafeteria":
      return { min: 25, max: 32 };
    case "Delivery / dark kitchen":
      return { min: 30, max: 38 };
    case "Restaurante":
      return { min: 28, max: 34 };
    default:
      return { min: 28, max: 35 };
  }
}

function limitePrimeCost(tipo: string | null): number {
  return tipo === "Delivery / dark kitchen" ? 65 : 60;
}

export function gerarPdfDiagnostico(dados: DadosDiagnosticoPdf): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  // Fundo
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, LARGURA, ALTURA, "F");

  let y = MARGEM;

  // Cabeçalho
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(...BRANCO);
  doc.text("SIG", MARGEM, y + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...CIANO);
  doc.text("SISTEMA INTELIGENTE DE GESTÃO", MARGEM + 14, y + 6);

  doc.setTextColor(...CINZA);
  doc.setFontSize(8);
  doc.text(
    new Date().toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }),
    LARGURA - MARGEM,
    y + 6,
    { align: "right" }
  );

  y += 12;
  doc.setDrawColor(...CIANO);
  doc.setLineWidth(0.3);
  doc.line(MARGEM, y, LARGURA - MARGEM, y);

  // Título
  y += 14;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...AMBAR);
  doc.text("DIAGNÓSTICO FINANCEIRO", MARGEM, y);

  y += 9;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...BRANCO);
  doc.text(dados.estabelecimento ?? "Seu negócio", MARGEM, y);

  y += 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...CINZA);
  const subtitulo = [dados.tipoNegocio, dados.cidade].filter(Boolean).join(" · ");
  if (subtitulo) doc.text(subtitulo, MARGEM, y);

  // Indicadores em três blocos
  y += 12;
  const larguraBloco = (UTIL - 8) / 3;
  const alturaBloco = 26;

  const indicadores = [
    { rotulo: "CMV", valor: pct(dados.cmvPercentual), destaque: false },
    { rotulo: "CUSTO DE PESSOAL", valor: pct(dados.custoPessoalPercentual), destaque: false },
    { rotulo: "PRIME COST", valor: pct(dados.primeCostPercentual), destaque: true },
  ];

  indicadores.forEach((ind, i) => {
    const x = MARGEM + i * (larguraBloco + 4);
    doc.setFillColor(...NAVY_CLARO);
    doc.rect(x, y, larguraBloco, alturaBloco, "F");
    doc.setDrawColor(...(ind.destaque ? AMBAR : CIANO));
    doc.setLineWidth(0.2);
    doc.rect(x, y, larguraBloco, alturaBloco, "S");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...CINZA);
    doc.text(ind.rotulo, x + larguraBloco / 2, y + 8, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(...(ind.destaque ? AMBAR : CIANO));
    doc.text(ind.valor, x + larguraBloco / 2, y + 19, { align: "center" });
  });

  y += alturaBloco + 12;

  // Os números que geraram o diagnóstico
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...CIANO);
  doc.text("NÚMEROS INFORMADOS", MARGEM, y);

  y += 7;
  const linhas = [
    ["Faturamento mensal", moeda(dados.faturamentoMensal)],
    ["Compras / insumos", moeda(dados.comprasMensal)],
    ["Equipe (salários + encargos)", moeda(dados.custoFuncionariosMensal)],
  ];

  linhas.forEach(([rotulo, valor]) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...BRANCO);
    doc.text(rotulo, MARGEM, y);
    doc.setTextColor(...AMBAR);
    doc.text(valor, LARGURA - MARGEM, y, { align: "right" });

    doc.setDrawColor(40, 55, 70);
    doc.setLineWidth(0.1);
    doc.line(MARGEM, y + 2, LARGURA - MARGEM, y + 2);
    y += 8;
  });

  // Referências do setor
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...CIANO);
  doc.text("REFERÊNCIA PARA O SEU SEGMENTO", MARGEM, y);

  y += 7;
  const faixa = faixaCmv(dados.tipoNegocio);
  const refs = [
    ["CMV", `${faixa.min}% a ${faixa.max}%`],
    ["Custo de pessoal", "25% a 35%"],
    ["Prime Cost", `até ${limitePrimeCost(dados.tipoNegocio)}%`],
  ];

  refs.forEach(([rotulo, valor]) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...BRANCO);
    doc.text(rotulo, MARGEM, y);
    doc.setTextColor(...CINZA);
    doc.text(valor, LARGURA - MARGEM, y, { align: "right" });

    doc.setDrawColor(40, 55, 70);
    doc.setLineWidth(0.1);
    doc.line(MARGEM, y + 2, LARGURA - MARGEM, y + 2);
    y += 8;
  });

  // Causa raiz
  if (dados.causaRaiz) {
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...AMBAR);
    doc.text("CAUSA MAIS PROVÁVEL", MARGEM, y);

    y += 7;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...BRANCO);
    const texto = doc.splitTextToSize(dados.causaRaiz, UTIL);
    doc.text(texto, MARGEM, y);
    y += texto.length * 5 + 4;
  }

  // Ação recomendada
  if (dados.acaoRecomendada) {
    y += 4;
    doc.setFillColor(...NAVY_CLARO);
    const textoAcao = doc.splitTextToSize(dados.acaoRecomendada, UTIL - 10);
    const alturaCaixa = textoAcao.length * 5 + 18;
    doc.rect(MARGEM, y, UTIL, alturaCaixa, "F");
    doc.setDrawColor(...CIANO);
    doc.setLineWidth(0.2);
    doc.rect(MARGEM, y, UTIL, alturaCaixa, "S");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...CIANO);
    doc.text("AÇÃO RECOMENDADA PARA ESTA SEMANA", MARGEM + 5, y + 8);

    doc.setFontSize(10);
    doc.setTextColor(...BRANCO);
    doc.text(textoAcao, MARGEM + 5, y + 15);
    y += alturaCaixa + 10;
  }

  // Rodapé
  const yRodape = ALTURA - 22;
  doc.setDrawColor(...CIANO);
  doc.setLineWidth(0.3);
  doc.line(MARGEM, yRodape, LARGURA - MARGEM, yRodape);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...CINZA);
  doc.text(
    "Esta é uma leitura inicial, baseada nos números informados.",
    MARGEM,
    yRodape + 6
  );
  doc.text(
    "Para uma análise completa da operação, fale com o consultor: +55 11 98550-3734",
    MARGEM,
    yRodape + 11
  );
  doc.setTextColor(...CIANO);
  doc.text("sig-fsi.com.br", LARGURA - MARGEM, yRodape + 11, { align: "right" });

  return doc;
}

/** Nome do arquivo, legível e com data — o lead vai guardar isso. */
export function nomeArquivoPdf(estabelecimento: string | null): string {
  const base = (estabelecimento ?? "negocio")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  const data = new Date().toISOString().slice(0, 10);
  return `diagnostico-${base}-${data}.pdf`;
}
