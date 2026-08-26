import type { Indicador } from "@/components/desempenho";
import { moeda, percentual } from "@/lib/formatters";

/**
 * Transforma os números do DRE em semáforo e leitura escrita.
 *
 * Tudo aqui é regra determinística — nenhuma IA. Motivo: este painel
 * abre em toda visita ao sistema. Chamar IA a cada carregamento
 * custaria caro e traria variação de texto sobre números idênticos,
 * o que confunde. A interpretação profunda continua sendo do
 * Consultor, sob demanda.
 *
 * As faixas seguem referências usuais de food service no Brasil. Elas
 * são ponto de partida, não verdade absoluta: um bar de alto giro e
 * um restaurante de menu degustação vivem em faixas diferentes.
 */

const FAIXA_PESSOAL_BOA = 30;
const FAIXA_PESSOAL_ATENCAO = 35;
const PRIME_COST_LIMITE = 65;

function variacao(atual: number, anterior: number): string | null {
  if (!anterior || anterior === 0) return null;
  const delta = ((atual - anterior) / Math.abs(anterior)) * 100;
  if (Math.abs(delta) < 1) return "estável em relação ao mês passado";
  const sinal = delta > 0 ? "acima" : "abaixo";
  return `${Math.abs(delta).toFixed(0)}% ${sinal} do mesmo período do mês passado`;
}

export function montarIndicadores(params: {
  dre: any;
  dreAnterior: any;
  metaCmv: number;
  contasAtrasadas: number;
  valorAtrasado: number;
}): { indicadores: Indicador[]; leitura: string } {
  const { dre, dreAnterior, metaCmv, contasAtrasadas, valorAtrasado } = params;

  const receita = Number(dre.receita_bruta) || 0;
  const cmvPct = Number(dre.cmv_percentual) || 0;
  const pessoal = Number(dre.pessoal) || 0;
  const pessoalPct = receita > 0 ? (pessoal * 100) / receita : 0;
  const margem = Number(dre.margem_liquida) || 0;
  const lucro = Number(dre.lucro_liquido) || 0;
  const primeCost = cmvPct + pessoalPct;

  // ---- CMV ----
  const cmvCor =
    cmvPct === 0
      ? "neutro"
      : cmvPct <= metaCmv
        ? "verde"
        : cmvPct <= metaCmv + 5
          ? "amarelo"
          : "vermelho";

  const cmvLeitura =
    cmvPct === 0
      ? "Sem compras lançadas neste mês."
      : cmvCor === "verde"
        ? "Dentro da meta. O custo da mercadoria está sob controle."
        : cmvCor === "amarelo"
          ? "Acima da meta, mas ainda recuperável. Vale conferir preço de compra e ficha técnica."
          : "Bem acima da meta. Cada real vendido está deixando pouco para o resto.";

  // ---- PESSOAL ----
  const pessoalCor =
    pessoal === 0
      ? "neutro"
      : pessoalPct <= FAIXA_PESSOAL_BOA
        ? "verde"
        : pessoalPct <= FAIXA_PESSOAL_ATENCAO
          ? "amarelo"
          : "vermelho";

  const pessoalLeitura =
    pessoal === 0
      ? "Sem folha lançada neste mês."
      : pessoalCor === "verde"
        ? "Equipe proporcional ao faturamento."
        : pessoalCor === "amarelo"
          ? "Pesando mais do que o ideal. Olhe a escala nos horários de menor movimento."
          : "Folha alta demais para o faturamento atual. Ou falta venda, ou sobra gente na escala.";

  // ---- MARGEM ----
  const margemCor =
    receita === 0
      ? "neutro"
      : margem < 0
        ? "vermelho"
        : margem < 5
          ? "amarelo"
          : "verde";

  const margemLeitura =
    receita === 0
      ? "Sem faturamento lançado."
      : margemCor === "vermelho"
        ? "O mês está dando prejuízo. É o ponto mais urgente."
        : margemCor === "amarelo"
          ? "Sobra pouco. Qualquer imprevisto no mês come esse resultado."
          : "O negócio está deixando resultado.";

  // ---- CAIXA ----
  const caixaCor =
    contasAtrasadas === 0
      ? "verde"
      : contasAtrasadas <= 2
        ? "amarelo"
        : "vermelho";

  const caixaLeitura =
    contasAtrasadas === 0
      ? "Nenhuma conta vencida em aberto."
      : contasAtrasadas <= 2
        ? `${moeda(valorAtrasado)} vencido. Regularize antes que vire juros.`
        : `${moeda(valorAtrasado)} vencido em várias contas. Sinal de aperto de caixa.`;

  const indicadores: Indicador[] = [
    {
      rotulo: "CMV",
      valor: percentual(cmvPct),
      cor: cmvCor as any,
      meta: `Meta ${percentual(metaCmv)}`,
      leitura: cmvLeitura,
    },
    {
      rotulo: "Custo de pessoal",
      valor: percentual(pessoalPct),
      cor: pessoalCor as any,
      meta: `Referência até ${percentual(FAIXA_PESSOAL_BOA)}`,
      leitura: pessoalLeitura,
    },
    {
      rotulo: "Margem líquida",
      valor: percentual(margem),
      cor: margemCor as any,
      meta: `Resultado ${moeda(lucro)}`,
      leitura: margemLeitura,
    },
    {
      rotulo: "Contas vencidas",
      valor: String(contasAtrasadas),
      cor: caixaCor as any,
      meta:
        contasAtrasadas > 0 ? `${moeda(valorAtrasado)} em atraso` : "Em dia",
      leitura: caixaLeitura,
    },
  ];

  // ---- LEITURA GERAL ----
  const partes: string[] = [];

  const variacaoReceita = dreAnterior
    ? variacao(receita, Number(dreAnterior.receita_bruta) || 0)
    : null;

  partes.push(
    `Faturamento de ${moeda(receita)} no mês até hoje` +
      (variacaoReceita ? `, ${variacaoReceita}.` : ".")
  );

  if (receita > 0 && pessoal > 0) {
    // Prime Cost só faz sentido quando os dois componentes existem.
    partes.push(
      `Somando mercadoria e equipe, ${percentual(primeCost)} do faturamento ` +
        (primeCost <= PRIME_COST_LIMITE
          ? `já está comprometido — dentro do limite usual de ${percentual(PRIME_COST_LIMITE)}.`
          : `está comprometido, acima do limite usual de ${percentual(PRIME_COST_LIMITE)}. É daqui que costuma vir o aperto.`)
    );
  }

  // O que priorizar: sempre o pior semáforo, nunca uma lista de tudo.
  if (margemCor === "vermelho") {
    partes.push(
      "Prioridade: o mês está no vermelho. Antes de qualquer ação de venda, ataque o maior custo — hoje é " +
        (cmvPct >= pessoalPct ? "a mercadoria." : "a folha.")
    );
  } else if (cmvCor === "vermelho") {
    partes.push(
      "Prioridade: o CMV. Confira se houve aumento de fornecedor, desperdício na cozinha ou porção fora da ficha técnica."
    );
  } else if (pessoalCor === "vermelho") {
    partes.push(
      "Prioridade: a escala. Compare o custo por turno com o movimento de cada dia."
    );
  } else if (caixaCor === "vermelho") {
    partes.push("Prioridade: as contas vencidas. Juro come margem em silêncio.");
  } else if (
    cmvCor === "amarelo" ||
    pessoalCor === "amarelo" ||
    margemCor === "amarelo"
  ) {
    partes.push(
      "Nada em estado crítico, mas há folga menor do que o ideal. Vale acompanhar de perto nas próximas semanas."
    );
  } else {
    partes.push("Os quatro indicadores estão em faixa saudável neste mês.");
  }

  partes.push(
    "Esta é uma leitura rápida sobre o mês corrente. O Consultor analisa período fechado e cruza com estoque e fornecedores."
  );

  return { indicadores, leitura: partes.join(" ") };
}
