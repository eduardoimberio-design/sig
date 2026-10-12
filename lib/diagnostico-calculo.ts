// lib/diagnostico-calculo.ts
//
// Única fonte das contas e das faixas de referência do diagnóstico.
//
// Regra do projeto: a IA nunca inventa número. Antes, o João fazia as contas de
// cabeça (e errava a posição na faixa: chamou 22,2% de "dentro" de 25%–35%), e o
// resumo do lead repetia essas contas com arredondamento próprio (R$ 16.200 na ficha,
// R$ 16.600 no PDF). Agora tudo nasce aqui:
//
// - o PDF usa estas funções para escrever a leitura financeira;
// - o João recebe o resultado pronto no contexto e só narra;
// - as faixas do texto do João vêm destas mesmas constantes, sem cópia manual.
//
// Posição na faixa (abaixo / dentro / acima) é decidida comparando o valor já
// arredondado a 1 casa — o mesmo que aparece escrito. Assim "35,0%" nunca vira
// "acima" de um teto de 35%.

export type Posicao = "abaixo" | "dentro" | "acima";

export interface Faixa {
  min: number;
  max: number;
}

export const FAIXAS_CMV: { tipo: string; faixa: Faixa }[] = [
  { tipo: "Bar", faixa: { min: 24, max: 30 } },
  { tipo: "Restaurante", faixa: { min: 28, max: 34 } },
  { tipo: "Café / Cafeteria", faixa: { min: 25, max: 32 } },
  { tipo: "Delivery / dark kitchen", faixa: { min: 30, max: 38 } },
  { tipo: "Outro", faixa: { min: 28, max: 35 } },
];

export const FAIXA_PESSOAL: Faixa = { min: 25, max: 35 };

export const ehDelivery = (tipo: string | null) => tipo === "Delivery / dark kitchen";

export function faixaCmvPorTipo(tipo: string | null): Faixa {
  const achada = FAIXAS_CMV.find((f) => f.tipo === tipo);
  return achada ? achada.faixa : { min: 28, max: 35 };
}

export function limitePrimeCost(tipo: string | null): number {
  return ehDelivery(tipo) ? 65 : 60;
}

const arred1 = (n: number) => Math.round(n * 10) / 10;

export function posicaoNaFaixa(valor: number, faixa: Faixa): Posicao {
  const v = arred1(valor);
  if (v < faixa.min) return "abaixo";
  if (v > faixa.max) return "acima";
  return "dentro";
}

export interface EntradaDiagnostico {
  tipoNegocio: string | null;
  faturamentoMensal: number | null;
  comprasMensal: number | null;
  custoFuncionariosMensal: number | null;
  pedidosMes?: number | null;
}

export interface DiagnosticoCalculado {
  tipoNegocio: string | null;
  faturamento: number | null;
  compras: number | null;
  equipe: number | null;

  cmv: number | null;
  faixaCmv: Faixa;
  posicaoCmv: Posicao | null;
  /** Distância até a faixa, em pontos percentuais, 1 casa. Positiva sempre. */
  pontosCmv: number | null;
  /** Só quando acima do teto: quanto isso representa em R$ por mês. */
  reaisAcimaDoTetoCmv: number | null;

  pessoal: number | null;
  posicaoPessoal: Posicao | null;
  pontosPessoal: number | null;

  primeCost: number | null;
  limitePrime: number;
  posicaoPrime: "dentro" | "acima" | null;
  pontosPrime: number | null;

  ticketMedio: number | null;
  pedidosMes: number | null;
}

export function calcularDiagnostico(e: EntradaDiagnostico): DiagnosticoCalculado {
  const fat = e.faturamentoMensal && e.faturamentoMensal > 0 ? e.faturamentoMensal : null;
  const compras = e.comprasMensal && e.comprasMensal > 0 ? e.comprasMensal : null;
  const equipe = e.custoFuncionariosMensal && e.custoFuncionariosMensal > 0 ? e.custoFuncionariosMensal : null;
  const pedidos = e.pedidosMes && e.pedidosMes > 0 ? e.pedidosMes : null;

  const faixaCmv = faixaCmvPorTipo(e.tipoNegocio);
  const limite = limitePrimeCost(e.tipoNegocio);

  const cmv = fat && compras ? (compras / fat) * 100 : null;
  const pessoal = fat && equipe ? (equipe / fat) * 100 : null;
  const prime = cmv !== null && pessoal !== null ? cmv + pessoal : null;

  const posicaoCmv = cmv !== null ? posicaoNaFaixa(cmv, faixaCmv) : null;
  const posicaoPessoal = pessoal !== null ? posicaoNaFaixa(pessoal, FAIXA_PESSOAL) : null;
  const posicaoPrime = prime !== null ? (arred1(prime) > limite ? "acima" : "dentro") : null;

  const pontosFora = (valor: number, faixa: Faixa, pos: Posicao | null) => {
    if (pos === "acima") return arred1(valor - faixa.max);
    if (pos === "abaixo") return arred1(faixa.min - valor);
    return 0;
  };

  return {
    tipoNegocio: e.tipoNegocio,
    faturamento: fat,
    compras,
    equipe,

    cmv,
    faixaCmv,
    posicaoCmv,
    pontosCmv: cmv !== null ? pontosFora(cmv, faixaCmv, posicaoCmv) : null,
    // Conta exata (percentual sem arredondar), arredondada só no fim, em reais.
    reaisAcimaDoTetoCmv:
      cmv !== null && fat && posicaoCmv === "acima"
        ? Math.round(((cmv - faixaCmv.max) / 100) * fat)
        : null,

    pessoal,
    posicaoPessoal,
    pontosPessoal: pessoal !== null ? pontosFora(pessoal, FAIXA_PESSOAL, posicaoPessoal) : null,

    primeCost: prime,
    limitePrime: limite,
    posicaoPrime,
    pontosPrime: prime !== null && posicaoPrime === "acima" ? arred1(prime - limite) : prime !== null ? 0 : null,

    ticketMedio: fat && pedidos ? fat / pedidos : null,
    pedidosMes: pedidos,
  };
}

// ---------- formatação (pt-BR) ----------

export function fmtPct(v: number | null, casas = 1): string {
  if (v === null) return "—";
  return (
    v.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas }) + "%"
  );
}

export function fmtPontos(v: number): string {
  return v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export function fmtReais(v: number | null): string {
  if (v === null) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

// ---------- frases do PDF (texto para o dono do negócio) ----------

export function fraseCmv(d: DiagnosticoCalculado): string | null {
  if (d.cmv === null || d.posicaoCmv === null) return null;
  const ref = `A referência para o seu tipo de negócio fica entre ${d.faixaCmv.min}% e ${d.faixaCmv.max}%. `;
  if (d.posicaoCmv === "acima") {
    return (
      ref +
      `Você está ${fmtPontos(d.pontosCmv ?? 0)} pontos percentuais acima do teto — na prática, ` +
      `${fmtReais(d.reaisAcimaDoTetoCmv)} por mês que provavelmente não precisariam sair, se o ` +
      `custo estivesse dentro da faixa esperada.`
    );
  }
  if (d.posicaoCmv === "abaixo") {
    return (
      ref +
      `Você está ${fmtPontos(d.pontosCmv ?? 0)} pontos percentuais abaixo do piso. Em geral isso é bom sinal, ` +
      `mas vale conferir se todas as compras do mês entraram na conta — um CMV muito baixo ` +
      `às vezes indica compras que ficaram de fora.`
    );
  }
  return ref + `Você está dentro dela, o que é um bom sinal nessa frente específica.`;
}

export function frasePessoal(d: DiagnosticoCalculado): string | null {
  if (d.pessoal === null || d.posicaoPessoal === null) return null;
  const base =
    `Já o custo com a equipe — salários e encargos — está em ${fmtPct(d.pessoal)} do faturamento. ` +
    `A referência geral é entre ${FAIXA_PESSOAL.min}% e ${FAIXA_PESSOAL.max}%`;
  if (d.posicaoPessoal === "acima") {
    return base + `, e você está ${fmtPontos(d.pontosPessoal ?? 0)} pontos acima do teto.`;
  }
  if (d.posicaoPessoal === "abaixo") {
    return (
      base +
      `, e você está ${fmtPontos(d.pontosPessoal ?? 0)} pontos abaixo do piso. Em geral isso é bom sinal, ` +
      `mas vale conferir se o valor informado inclui encargos, pró-labore e horas extras — ` +
      `é o que mais costuma ficar de fora desse número.` +
      (ehDelivery(d.tipoNegocio)
        ? ` Em delivery, um valor menor é esperado, porque não há equipe de salão.`
        : ``)
    );
  }
  return base + `, e você está dentro dessa faixa.`;
}

export function frasePrime(d: DiagnosticoCalculado): string | null {
  if (d.primeCost === null || d.posicaoPrime === null) return null;
  const inicio = `Somando os dois — o que chamamos de Prime Cost — você chega a ${fmtPct(d.primeCost)} do faturamento. `;
  if (d.posicaoPrime === "acima") {
    return (
      inicio +
      `O saudável seria até ${d.limitePrime}%, então hoje sobra pouco (ou nada) para pagar ` +
      `aluguel, contas fixas e ainda ter lucro no fim do mês.`
    );
  }
  return (
    inicio +
    `Isso está dentro da margem considerada saudável (até ${d.limitePrime}%), o que significa ` +
    `que ainda sobra espaço para cobrir despesas fixas e gerar lucro.`
  );
}

// ---------- bloco entregue ao João ----------

const nomePosicao = (p: Posicao) =>
  p === "acima" ? `ACIMA do teto` : p === "abaixo" ? `ABAIXO do piso` : `DENTRO da faixa`;

/**
 * Texto injetado no contexto do João. Traz as contas prontas e a posição de cada
 * indicador; o modelo só escolhe as palavras. Devolve null se não há faturamento.
 */
export function blocoParaJoao(d: DiagnosticoCalculado): string | null {
  if (d.faturamento === null) return null;

  const linhas: string[] = [
    "NÚMEROS CALCULADOS PELO SISTEMA — use exatamente estes valores, com as mesmas casas decimais. " +
      "Não refaça nenhuma conta, não arredonde pontos nem reais por conta própria, e não contradiga a posição (ABAIXO / DENTRO / ACIMA) indicada.",
    `Tipo de negócio considerado: ${d.tipoNegocio ?? "não informado (faixa de 'Outro')"}`,
    `Faturamento mensal: ${fmtReais(d.faturamento)}` +
      (d.compras !== null ? ` | Compras: ${fmtReais(d.compras)}` : "") +
      (d.equipe !== null ? ` | Equipe: ${fmtReais(d.equipe)}` : ""),
  ];

  if (d.cmv !== null && d.posicaoCmv) {
    let l = `- CMV: ${fmtPct(d.cmv)} — referência ${d.faixaCmv.min}% a ${d.faixaCmv.max}% — ${nomePosicao(d.posicaoCmv)}`;
    if (d.posicaoCmv !== "dentro") l += ` em ${fmtPontos(d.pontosCmv ?? 0)} pontos`;
    if (d.posicaoCmv === "acima") l += ` (cerca de ${fmtReais(d.reaisAcimaDoTetoCmv)} por mês acima do teto)`;
    linhas.push(l);
  } else {
    linhas.push("- CMV: não calculável (falta faturamento ou compras). Diga o que falta; não estime.");
  }

  if (d.pessoal !== null && d.posicaoPessoal) {
    let l = `- Custo de pessoal: ${fmtPct(d.pessoal)} — referência ${FAIXA_PESSOAL.min}% a ${FAIXA_PESSOAL.max}% — ${nomePosicao(d.posicaoPessoal)}`;
    if (d.posicaoPessoal !== "dentro") l += ` em ${fmtPontos(d.pontosPessoal ?? 0)} pontos`;
    linhas.push(l);
  } else {
    linhas.push("- Custo de pessoal: não calculável (falta o custo da equipe). Diga o que falta; não estime.");
  }

  if (d.primeCost !== null && d.posicaoPrime) {
    let l = `- Prime Cost: ${fmtPct(d.primeCost)} — limite saudável ${d.limitePrime}% — ${
      d.posicaoPrime === "acima" ? "ACIMA do limite" : "DENTRO do limite"
    }`;
    if (d.posicaoPrime === "acima") l += ` em ${fmtPontos(d.pontosPrime ?? 0)} pontos`;
    linhas.push(l);
  }

  if (d.ticketMedio !== null && d.pedidosMes !== null) {
    linhas.push(
      `- Ticket médio: ${fmtReais(d.ticketMedio)} (faturamento ÷ ${d.pedidosMes.toLocaleString("pt-BR")} pedidos por mês, como a pessoa informou)`
    );
  }

  linhas.push(
    "COMO FALAR DE CADA POSIÇÃO:",
    "- ACIMA: diga o tamanho em pontos e, no CMV, o valor em reais já calculado acima.",
    "- ABAIXO no custo de pessoal: diga que está abaixo da referência, o que em geral é bom sinal, mas que vale conferir se o valor inclui encargos, pró-labore e horas extras." +
      (ehDelivery(d.tipoNegocio) ? " Em delivery, acrescente que é esperado, por não haver equipe de salão." : ""),
    "- ABAIXO no CMV: diga que está abaixo da referência e que vale conferir se todas as compras do mês entraram na conta.",
    "- DENTRO: diga que está dentro da referência, sem exagerar o elogio.",
    "- Nunca escreva 'dentro da referência' para um indicador marcado ABAIXO ou ACIMA."
  );

  return linhas.join("\n");
}
