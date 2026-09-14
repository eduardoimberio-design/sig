// lib/diagnostico-pdf.ts
//
// Gera o PDF do diagnóstico. Roda no navegador (jsPDF), não no servidor — assim o
// download é imediato, não consome recurso da Vercel e não precisa de armazenamento.
//
// v2: virou dissertativo e educativo, porque a maioria de quem recebe este PDF não
// tem familiaridade com termos financeiros. Dois princípios guiam isso:
//
// 1. A "leitura financeira" é escrita em CÓDIGO a partir dos números calculados —
//    não depende do que a IA resumiu durante a conversa. Isso garante qualidade e
//    completude consistentes em todo diagnóstico, mesmo quando a conversa foi curta.
// 2. O glossário explica cada termo com linguagem cotidiana e analogia, nunca
//    assumindo que quem lê sabe o que é "Prime Cost".
//
// A causa raiz e a ação recomendada (vindas da conversa, personalizadas) continuam
// presentes — mas agora como complemento à leitura técnica, não como o único texto
// explicativo do documento.

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
const CINZA_ESCURO: [number, number, number] = [40, 55, 70];

const LARGURA = 210;
const ALTURA = 297;
const MARGEM = 20;
const UTIL = LARGURA - MARGEM * 2;
const RODAPE_Y = ALTURA - 16;

function moeda(valor: number | null): string {
  if (valor === null) return "—";
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

function pct(valor: number | null, casas = 1): string {
  if (valor === null) return "—";
  return valor.toLocaleString("pt-BR", { maximumFractionDigits: casas }) + "%";
}

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

const FAIXA_PESSOAL = { min: 25, max: 35 };

function limitePrimeCost(tipo: string | null): number {
  return tipo === "Delivery / dark kitchen" ? 65 : 60;
}

/**
 * Constrói a leitura financeira em linguagem simples, calculada a partir dos
 * números — não do resumo da conversa. Segue o mesmo princípio do motor de
 * diagnóstico do formulário: contas feitas em código, nunca por texto livre de IA.
 */
function construirLeituraFinanceira(dados: DadosDiagnosticoPdf): string[] {
  const paragrafos: string[] = [];
  const { cmvPercentual, custoPessoalPercentual, primeCostPercentual, faturamentoMensal, tipoNegocio } = dados;

  if (cmvPercentual === null || faturamentoMensal === null) {
    return [
      "Não foi possível calcular a leitura completa porque faltam alguns números — " +
        "o diagnóstico abaixo usa o que foi informado.",
    ];
  }

  const faixa = faixaCmv(tipoNegocio);
  const acimaCmv = cmvPercentual > faixa.max;
  const gastoInsumos = (cmvPercentual / 100) * faturamentoMensal;

  paragrafos.push(
    `De cada R$ 100 que entram no caixa, R$ ${(cmvPercentual).toFixed(0)} já foram ` +
      `gastos comprando o que virou os pratos vendidos — isso é o CMV. No seu caso, ` +
      `isso representa ${moeda(gastoInsumos)} por mês só em insumos, sobre um ` +
      `faturamento de ${moeda(faturamentoMensal)}.`
  );

  if (acimaCmv) {
    const excedente = cmvPercentual - faixa.max;
    const valorExcedente = (excedente / 100) * faturamentoMensal;
    paragrafos.push(
      `A referência para o seu tipo de negócio fica entre ${faixa.min}% e ${faixa.max}%. ` +
        `Você está ${excedente.toFixed(1)} pontos percentuais acima do teto — na prática, ` +
        `${moeda(valorExcedente)} por mês que provavelmente não precisariam sair, se o ` +
        `custo estivesse dentro da faixa esperada.`
    );
  } else {
    paragrafos.push(
      `A referência para o seu tipo de negócio fica entre ${faixa.min}% e ${faixa.max}% — ` +
        `você está dentro dela, o que é um bom sinal nessa frente específica.`
    );
  }

  if (custoPessoalPercentual !== null) {
    const acimaPessoal = custoPessoalPercentual > FAIXA_PESSOAL.max;
    paragrafos.push(
      `Já o custo com a equipe — salários e encargos — está em ${pct(custoPessoalPercentual)} ` +
        `do faturamento. A referência geral é entre ${FAIXA_PESSOAL.min}% e ${FAIXA_PESSOAL.max}%, ` +
        `${acimaPessoal ? "e você está acima dela" : "e você está dentro dessa faixa"}.`
    );
  }

  if (primeCostPercentual !== null) {
    const limite = limitePrimeCost(tipoNegocio);
    const acimaPrime = primeCostPercentual > limite;
    paragrafos.push(
      `Somando os dois — o que chamamos de Prime Cost — você chega a ${pct(primeCostPercentual)} ` +
        `do faturamento. ${
          acimaPrime
            ? `O saudável seria até ${limite}%, então hoje sobra pouco (ou nada) para pagar ` +
              `aluguel, contas fixas e ainda ter lucro no fim do mês.`
            : `Isso está dentro da margem considerada saudável (até ${limite}%), o que significa ` +
              `que ainda sobra espaço para cobrir despesas fixas e gerar lucro.`
        }`
    );
  }

  return paragrafos;
}

/** Uma quebra de página segura: se não houver espaço, cria a próxima página. */
function garantirEspaco(doc: jsPDF, y: number, necessario: number): number {
  if (y + necessario > RODAPE_Y - 6) {
    doc.addPage();
    doc.setFillColor(...NAVY);
    doc.rect(0, 0, LARGURA, ALTURA, "F");
    return MARGEM;
  }
  return y;
}

function escreverParagrafo(
  doc: jsPDF,
  texto: string,
  y: number,
  opcoes?: { corTexto?: [number, number, number]; tamanho?: number }
): number {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(opcoes?.tamanho ?? 10);
  doc.setTextColor(...(opcoes?.corTexto ?? BRANCO));
  const linhas = doc.splitTextToSize(texto, UTIL);
  y = garantirEspaco(doc, y, linhas.length * 5 + 4);
  doc.text(linhas, MARGEM, y);
  return y + linhas.length * 5 + 5;
}

function escreverRotulo(doc: jsPDF, texto: string, y: number, cor: [number, number, number] = CIANO): number {
  y = garantirEspaco(doc, y, 10);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...cor);
  doc.text(texto.toUpperCase(), MARGEM, y);
  return y + 7;
}

function adicionarRodape(doc: jsPDF) {
  doc.setDrawColor(...CIANO);
  doc.setLineWidth(0.3);
  doc.line(MARGEM, RODAPE_Y - 6, LARGURA - MARGEM, RODAPE_Y - 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...CINZA);
  doc.text("Leitura inicial, baseada nos números informados na conversa.", MARGEM, RODAPE_Y - 1);
  doc.text("Consultor: +55 11 98550-3734", MARGEM, RODAPE_Y + 4);
  doc.setTextColor(...CIANO);
  doc.text("sig-fsi.com.br", LARGURA - MARGEM, RODAPE_Y + 4, { align: "right" });
}

export function gerarPdfDiagnostico(dados: DadosDiagnosticoPdf): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });

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
  doc.text(
    new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" }),
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

  // ---- O QUE CADA NÚMERO SIGNIFICA (glossário em linguagem simples) ----
  y = escreverRotulo(doc, "O que cada número significa", y, AMBAR);

  const glossario: Array<[string, string]> = [
    [
      "CMV (Custo da Mercadoria Vendida)",
      "É quanto do dinheiro que entra já foi gasto comprando os ingredientes e produtos " +
        "que viraram os pratos vendidos. Se o CMV é 40%, de cada R$ 100 que você fatura, " +
        "R$ 40 já foram usados só pra comprar o que foi vendido.",
    ],
    [
      "Custo de pessoal",
      "É quanto do faturamento vai para salários e encargos da equipe. Junto com o CMV, " +
        "é um dos dois maiores custos de qualquer negócio de alimentação.",
    ],
    [
      "Prime Cost",
      "É a soma do CMV com o custo de pessoal. Esse é o número mais importante de todos, " +
        "porque mostra quanto sobra, no fim das contas, pra pagar aluguel, conta de luz e " +
        "ainda ter lucro. Quanto menor o Prime Cost, mais fôlego o negócio tem.",
    ],
  ];

  glossario.forEach(([termo, explicacao]) => {
    const linhasExplicacao = doc.splitTextToSize(explicacao, UTIL - 6);
    const alturaCaixa = linhasExplicacao.length * 4.6 + 12;
    y = garantirEspaco(doc, y, alturaCaixa);

    doc.setFillColor(...NAVY_CLARO);
    doc.rect(MARGEM, y, UTIL, alturaCaixa, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...CIANO);
    doc.text(termo, MARGEM + 4, y + 7);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...BRANCO);
    doc.text(linhasExplicacao, MARGEM + 4, y + 13);

    y += alturaCaixa + 5;
  });

  // ---- NÚMEROS INFORMADOS ----
  y += 4;
  y = escreverRotulo(doc, "Números informados", y);

  const linhasNumeros = [
    ["Faturamento mensal", moeda(dados.faturamentoMensal)],
    ["Compras / insumos", moeda(dados.comprasMensal)],
    ["Equipe (salários + encargos)", moeda(dados.custoFuncionariosMensal)],
  ];

  linhasNumeros.forEach(([rotulo, valor]) => {
    y = garantirEspaco(doc, y, 9);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...BRANCO);
    doc.text(rotulo, MARGEM, y);
    doc.setTextColor(...AMBAR);
    doc.text(valor, LARGURA - MARGEM, y, { align: "right" });
    doc.setDrawColor(...CINZA_ESCURO);
    doc.setLineWidth(0.1);
    doc.line(MARGEM, y + 2, LARGURA - MARGEM, y + 2);
    y += 8;
  });

  // ---- LEITURA FINANCEIRA (dissertativa, calculada em código) ----
  y += 6;
  y = escreverRotulo(doc, "O que esses números dizem sobre o seu negócio", y);

  construirLeituraFinanceira(dados).forEach((paragrafo) => {
    y = escreverParagrafo(doc, paragrafo, y);
  });

  // ---- CAUSA PROVÁVEL (da conversa, personalizada) ----
  if (dados.causaRaiz) {
    y += 4;
    y = escreverRotulo(doc, "Causa mais provável", y, AMBAR);
    y = escreverParagrafo(doc, dados.causaRaiz, y);
  }

  // ---- AÇÃO RECOMENDADA ----
  if (dados.acaoRecomendada) {
    y += 4;
    const textoAcao = doc.splitTextToSize(dados.acaoRecomendada, UTIL - 10);
    const alturaCaixa = textoAcao.length * 5 + 18;
    y = garantirEspaco(doc, y, alturaCaixa);

    doc.setFillColor(...NAVY_CLARO);
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
    y += alturaCaixa + 8;
  }

  // Rodapé em todas as páginas geradas
  const totalPaginas = doc.getNumberOfPages();
  for (let i = 1; i <= totalPaginas; i++) {
    doc.setPage(i);
    adicionarRodape(doc);
  }

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
