// lib/diagnostico/causas.ts
//
// Motor de diagnóstico v3. Diferente das versões anteriores, agora os indicadores
// (CMV%, custo de pessoal%, Prime Cost%) são CALCULADOS a partir de números reais
// informados pelo lead — não são mais estimativas qualitativas. Isso é o que dá o
// tom de análise profissional: números concretos comparados a faixas de referência
// do setor, com veredito claro. Toda a matemática acontece aqui, em código — a
// única coisa que a IA (se algum dia for usada nesta tela) poderia fazer é reescrever
// a prosa, nunca recalcular ou inventar os números.

export type TipoNegocio = "Bar" | "Restaurante" | "Café / Cafeteria" | "Outro";

export type MaiorPreocupacao =
  | "Custo de insumos subindo mais rápido do que consigo repassar"
  | "Ticket médio abaixo do que eu gostaria"
  | "Não sei exatamente onde estou perdendo dinheiro"
  | "Equipe e rotina de trabalho desorganizadas";

export interface DiagnosticoInput {
  tipoNegocio: TipoNegocio;
  faturamentoMensal: number;
  comprasMensal: number;
  custoFuncionariosMensal: number;
  maiorPreocupacao: MaiorPreocupacao;
}

export interface Indicadores {
  cmvPercentual: number;
  custoPessoalPercentual: number;
  primeCostPercentual: number;
  margemEstimada: number;
}

export interface DiagnosticoResultado {
  indicadores: Indicadores;
  leituraFinanceira: string;
  causaRaiz: string;
  acaoRecomendada: string;
}

type Faixa = { min: number; max: number };
type StatusFaixa = "abaixo" | "dentro" | "acima";

const FAIXA_CMV: Record<TipoNegocio, Faixa> = {
  Bar: { min: 24, max: 30 },
  Restaurante: { min: 28, max: 34 },
  "Café / Cafeteria": { min: 25, max: 32 },
  Outro: { min: 28, max: 35 },
};

const FAIXA_CUSTO_PESSOAL: Faixa = { min: 25, max: 35 };
const PRIME_COST_LIMITE_SAUDAVEL = 60;

function classificar(valor: number, faixa: Faixa): StatusFaixa {
  if (valor < faixa.min) return "abaixo";
  if (valor > faixa.max) return "acima";
  return "dentro";
}

function fmt(valor: number): string {
  return valor.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

function calcularIndicadores(input: DiagnosticoInput): Indicadores {
  const { faturamentoMensal, comprasMensal, custoFuncionariosMensal } = input;
  const cmvPercentual = (comprasMensal / faturamentoMensal) * 100;
  const custoPessoalPercentual = (custoFuncionariosMensal / faturamentoMensal) * 100;
  const primeCostPercentual = cmvPercentual + custoPessoalPercentual;
  const margemEstimada = 100 - primeCostPercentual;
  return { cmvPercentual, custoPessoalPercentual, primeCostPercentual, margemEstimada };
}

function construirLeituraFinanceira(
  input: DiagnosticoInput,
  indicadores: Indicadores,
  statusCmv: StatusFaixa,
  statusPessoal: StatusFaixa
): string {
  const faixaCmv = FAIXA_CMV[input.tipoNegocio];
  const partes: string[] = [];

  partes.push(
    `Seu CMV (custo da mercadoria vendida) está em ${fmt(indicadores.cmvPercentual)}% do faturamento ` +
      `(R$ ${fmt(input.comprasMensal)} em compras sobre R$ ${fmt(input.faturamentoMensal)} de faturamento). ` +
      `A referência para o seu segmento costuma ficar entre ${faixaCmv.min}% e ${faixaCmv.max}% — o seu está ` +
      `${statusCmv === "dentro" ? "dentro dessa faixa" : statusCmv === "acima" ? `acima dela, em ${fmt(indicadores.cmvPercentual - faixaCmv.max)} pontos percentuais` : "abaixo dela, o que costuma ser bom sinal, mas vale confirmar se a ficha técnica não está subestimando custo"}.`
  );

  partes.push(
    `Seu custo com equipe está em ${fmt(indicadores.custoPessoalPercentual)}% do faturamento. ` +
      `A referência geral do setor gira entre ${FAIXA_CUSTO_PESSOAL.min}% e ${FAIXA_CUSTO_PESSOAL.max}% — o seu está ` +
      `${statusPessoal === "dentro" ? "dentro dessa faixa" : statusPessoal === "acima" ? `acima dela, em ${fmt(indicadores.custoPessoalPercentual - FAIXA_CUSTO_PESSOAL.max)} pontos percentuais` : "abaixo dela"}.`
  );

  partes.push(
    `Somando os dois — o que chamamos de Prime Cost, o principal indicador de saúde financeira de um ` +
      `negócio de alimentação — você está em ${fmt(indicadores.primeCostPercentual)}% do faturamento. ` +
      `Operações saudáveis no setor costumam manter esse número até ${PRIME_COST_LIMITE_SAUDAVEL}%, deixando o ` +
      `restante para cobrir despesas fixas (aluguel, energia, contas gerais) e ainda gerar lucro. ` +
      `${
        indicadores.primeCostPercentual > PRIME_COST_LIMITE_SAUDAVEL
          ? `Hoje você está ${fmt(indicadores.primeCostPercentual - PRIME_COST_LIMITE_SAUDAVEL)} pontos percentuais acima dessa margem de segurança — na prática, sobra pouco (ou nada) depois de pagar mercadoria e equipe.`
          : `Você está dentro da margem de segurança, o que é um bom indicativo — o ponto de atenção passa a ser onde exatamente a operação pode evoluir.`
      }`
  );

  return partes.join(" ");
}

export function diagnosticar(input: DiagnosticoInput): DiagnosticoResultado {
  const indicadores = calcularIndicadores(input);
  const faixaCmv = FAIXA_CMV[input.tipoNegocio];
  const statusCmv = classificar(indicadores.cmvPercentual, faixaCmv);
  const statusPessoal = classificar(indicadores.custoPessoalPercentual, FAIXA_CUSTO_PESSOAL);

  const leituraFinanceira = construirLeituraFinanceira(input, indicadores, statusCmv, statusPessoal);

  let causaRaiz: string;
  let acaoRecomendada: string;

  if (statusCmv === "acima" && statusPessoal === "acima") {
    causaRaiz =
      "Seus dois principais custos variáveis — mercadoria e equipe — estão simultaneamente acima da faixa saudável para o seu segmento. Isso indica um problema estrutural de precificação ou de dimensionamento da operação, não um evento pontual: o negócio está, hoje, absorvendo custo demais em relação ao que fatura.";
    acaoRecomendada =
      "Priorizar, nesta ordem: (1) recalcular a ficha técnica dos itens de maior saída para confirmar o custo real de cada prato, e (2) revisar a escala de equipe nos horários de menor movimento, buscando reduzir o custo de pessoal sem comprometer o atendimento.";
  } else if (statusCmv === "acima") {
    causaRaiz =
      "O custo de mercadoria está puxando a margem para baixo — provavelmente por ficha técnica desatualizada, porcionamento inconsistente na cozinha, ou condições de compra que não acompanham o volume atual da operação.";
    acaoRecomendada =
      "Recalcular a ficha técnica dos itens de maior saída e revisar as condições de compra dos 3 principais insumos nas próximas 2 semanas.";
  } else if (statusPessoal === "acima") {
    causaRaiz =
      "O custo de pessoal está acima do que o faturamento atual sustenta com folga — o que costuma acontecer quando a escala da equipe foi dimensionada para um volume de movimento diferente do atual, ou quando o mix de cargos não está alinhado à operação do dia a dia.";
    acaoRecomendada =
      "Mapear o custo de mão de obra por turno e comparar com o volume de atendimento de cada horário, buscando ajustar a escala aos picos reais de movimento.";
  } else {
    // Prime Cost dentro da faixa saudável — a causa passa a ser a preocupação declarada
    switch (input.maiorPreocupacao) {
      case "Ticket médio abaixo do que eu gostaria":
        causaRaiz =
          "Seus custos variáveis estão sob controle — o que sugere que o ponto de atenção não é custo, e sim receita: o cardápio provavelmente não tem uma hierarquia clara de oferta, com itens de maior margem em destaque e sugestões naturais de complemento no atendimento.";
        acaoRecomendada =
          "Reorganizar o cardápio priorizando os itens de maior margem e orientar a equipe a sugerir 1 complemento por pedido.";
        break;
      case "Não sei exatamente onde estou perdendo dinheiro":
        causaRaiz =
          "Os indicadores calculados aqui mostram uma operação numericamente saudável — o que sugere que a percepção de estar perdendo dinheiro vem da falta de acompanhamento frequente desses números, não necessariamente de um problema real e ativo hoje.";
        acaoRecomendada =
          "Estabelecer uma rotina fixa (semanal, não mensal) de leitura de CMV, custo de pessoal e ticket médio, para transformar essa percepção em fato acompanhado de perto.";
        break;
      case "Equipe e rotina de trabalho desorganizadas":
        causaRaiz =
          "Do ponto de vista financeiro, a operação está equilibrada — o que reforça que o problema relatado é operacional, não de custo: provavelmente faltam checklists e responsáveis definidos por etapa, gerando retrabalho apesar dos números saudáveis.";
        acaoRecomendada =
          "Mapear e documentar os 3 principais fluxos operacionais (abertura, pico e fechamento) e formalizar quem responde por cada etapa.";
        break;
      default:
        causaRaiz =
          "Os condições de compra atuais provavelmente ainda têm espaço de negociação, mesmo com o CMV dentro da faixa — especialmente se o volume de compra cresceu nos últimos meses sem repactuação de preços com fornecedores.";
        acaoRecomendada =
          "Revisar contratos e frequência de compra dos 3 principais insumos, buscando condições melhores com base no volume real consumido hoje.";
    }
  }

  return { indicadores, leituraFinanceira, causaRaiz, acaoRecomendada };
}
