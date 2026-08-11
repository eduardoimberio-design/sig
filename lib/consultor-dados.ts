import { createAdminClient } from "@/lib/supabase/admin";

export interface AnaliseEstruturada {
  periodo: { inicio: string; fim: string };
  periodoAnterior: { inicio: string; fim: string };

  financeiro: {
    atual: any;
    anterior: any;
    variacaoReceita: number | null;
    variacaoLucro: number | null;
  };

  produtosForaDaMeta: {
    nome: string;
    precoAtual: number;
    custoFicha: number;
    cmvPercentual: number;
    precoSugerido: number;
  }[];

  estoqueBaixo: {
    nome: string;
    estoqueAtual: number;
    estoqueMinimo: number;
    unidade: string;
  }[];

  concentracaoFornecedores: { nome: string; valor: number; participacao: number }[];

  sugestoesTicketMedio: {
    produtosAltaMargem: { nome: string; categoria: string | null; preco: number; margemPercentual: number }[];
    categoriasSemComplemento: string[]; // categorias com produto mas sem par de "acompanhamento"
    ticketMedioAtual: number;
  };

  temDadosSuficientes: boolean;
}

function diasEntre(a: string, b: string) {
  return Math.round(
    (new Date(b).getTime() - new Date(a).getTime()) / 86400000
  );
}

/**
 * Monta o retrato de dados do negócio no período. Nada aqui usa IA —
 * é cálculo puro sobre o que Financeiro e Estoque já produzem. A IA
 * entra só depois, para interpretar e escrever, nunca para calcular.
 */
export async function coletarAnaliseEstruturada(
  empresaId: string,
  periodoInicio: string,
  periodoFim: string
): Promise<AnaliseEstruturada> {
  const admin = createAdminClient();

  const duracaoDias = diasEntre(periodoInicio, periodoFim) || 1;
  const inicioAnterior = new Date(periodoInicio);
  inicioAnterior.setDate(inicioAnterior.getDate() - duracaoDias);
  const fimAnterior = new Date(periodoInicio);
  fimAnterior.setDate(fimAnterior.getDate() - 1);

  const [
    { data: dreAtual },
    { data: dreAnterior },
    { data: metaConfig },
    { data: cmvProdutos },
    { data: estoqueBaixo },
    { data: despesasPagas },
  ] = await Promise.all([
    admin.rpc("dre_periodo", {
      p_empresa_id: empresaId,
      p_inicio: periodoInicio,
      p_fim: periodoFim,
    }),
    admin.rpc("dre_periodo", {
      p_empresa_id: empresaId,
      p_inicio: inicioAnterior.toISOString().slice(0, 10),
      p_fim: fimAnterior.toISOString().slice(0, 10),
    }),
    admin
      .from("config_consultor")
      .select("meta_cmv_alerta")
      .eq("empresa_id", empresaId)
      .maybeSingle(),
    admin.rpc("cmv_por_produto", { p_empresa_id: empresaId }),
    admin.from("insumos_estoque_baixo").select("*").eq("empresa_id", empresaId),
    admin
      .from("contas_pagar")
      .select("fornecedor, descricao, valor")
      .eq("empresa_id", empresaId)
      .eq("status", "pago")
      .gte("vencimento", periodoInicio)
      .lte("vencimento", periodoFim),
  ]);

  const metaCmv = Number(metaConfig?.meta_cmv_alerta ?? 35);

  const produtosForaDaMeta = (cmvProdutos ?? [])
    .filter((p: any) => Number(p.qtd_insumos) > 0 && Number(p.cmv_percentual) > metaCmv)
    .map((p: any) => ({
      nome: p.produto_nome,
      precoAtual: Number(p.preco_venda),
      custoFicha: Number(p.custo_ficha),
      cmvPercentual: Number(p.cmv_percentual),
      // Preço que traria o CMV exatamente para a meta configurada
      precoSugerido: Math.ceil((Number(p.custo_ficha) / (metaCmv / 100)) * 100) / 100,
    }));

  // Concentração de fornecedores no período — reaproveita a mesma
  // lógica do Pareto do módulo Financeiro.
  const mapaFornecedor = new Map<string, number>();
  for (const d of despesasPagas ?? []) {
    const nome = d.fornecedor?.trim() || d.descricao;
    mapaFornecedor.set(nome, (mapaFornecedor.get(nome) ?? 0) + Number(d.valor));
  }
  const totalDespesas = [...mapaFornecedor.values()].reduce((s, v) => s + v, 0);
  const concentracaoFornecedores = [...mapaFornecedor.entries()]
    .map(([nome, valor]) => ({
      nome,
      valor,
      participacao: totalDespesas > 0 ? (valor / totalDespesas) * 100 : 0,
    }))
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 5);

  const receitaAtual = Number(dreAtual?.receita_bruta ?? 0);
  const receitaAnterior = Number(dreAnterior?.receita_bruta ?? 0);
  const lucroAtual = Number(dreAtual?.lucro_liquido ?? 0);
  const lucroAnterior = Number(dreAnterior?.lucro_liquido ?? 0);

  // Ticket médio: sem dado de venda por item, a sugestão de combo se
  // apoia em margem (dado que já temos) em vez de volume de venda
  // (dado que o sistema ainda não coleta — depende do Módulo Comercial
  // vir a registrar pedido por item no futuro).
  const { data: produtosCatalogo } = await admin
    .from("produtos")
    .select("nome, categoria")
    .eq("empresa_id", empresaId)
    .eq("ativo_catalogo", true);

  const produtosAltaMargem = (cmvProdutos ?? [])
    .filter((p: any) => Number(p.qtd_insumos) > 0)
    .map((p: any) => ({
      nome: p.produto_nome,
      categoria:
        (produtosCatalogo ?? []).find((c) => c.nome === p.produto_nome)
          ?.categoria ?? null,
      preco: Number(p.preco_venda),
      margemPercentual: Number(p.margem_percentual),
    }))
    .sort((a, b) => b.margemPercentual - a.margemPercentual)
    .slice(0, 5);

  const categoriasExistentes = new Set(
    (produtosCatalogo ?? []).map((p) => p.categoria).filter(Boolean)
  );
  const categoriasEsperadas = ["sobremesa", "bebida", "entrada"];
  const categoriasSemComplemento = categoriasEsperadas.filter(
    (c) =>
      ![...categoriasExistentes].some((existente) =>
        existente?.toLowerCase().includes(c)
      )
  );

  return {
    periodo: { inicio: periodoInicio, fim: periodoFim },
    periodoAnterior: {
      inicio: inicioAnterior.toISOString().slice(0, 10),
      fim: fimAnterior.toISOString().slice(0, 10),
    },
    financeiro: {
      atual: dreAtual,
      anterior: dreAnterior,
      variacaoReceita:
        receitaAnterior > 0
          ? ((receitaAtual - receitaAnterior) / receitaAnterior) * 100
          : null,
      variacaoLucro:
        receitaAnterior > 0 && lucroAnterior !== 0
          ? ((lucroAtual - lucroAnterior) / Math.abs(lucroAnterior)) * 100
          : null,
    },
    produtosForaDaMeta,
    estoqueBaixo: (estoqueBaixo ?? []).map((i: any) => ({
      nome: i.nome,
      estoqueAtual: Number(i.estoque_atual),
      estoqueMinimo: Number(i.estoque_minimo),
      unidade: i.unidade_medida,
    })),
    concentracaoFornecedores,
    sugestoesTicketMedio: {
      produtosAltaMargem,
      categoriasSemComplemento,
      ticketMedioAtual: Number(dreAtual?.ticket_medio ?? 0),
    },
    temDadosSuficientes: receitaAtual > 0,
  };
}
