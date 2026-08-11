"use server";

import { createClient } from "@/lib/supabase/server";

export interface DadosRelatorio {
  empresaNome: string;
  periodo: { inicio: string; fim: string };
  dre: any;
  vendasDiarias: any[];
  contasPagar: any[];
  contasReceber: any[];
  cmvProdutos: any[];
  temDados: boolean;
}

/**
 * Reúne tudo que os módulos já calculam num pacote só, para
 * alimentar tanto a tela quanto os arquivos exportados. Nada é
 * recalculado aqui — o DRE e o CMV vêm das mesmas funções que o
 * Financeiro e o Estoque usam, garantindo que o relatório nunca
 * mostre número diferente do que aparece no painel.
 */
export async function coletarDadosRelatorio(
  inicio: string,
  fim: string
): Promise<DadosRelatorio | { erro: string }> {
  const supabase = createClient();

  const { data: empresa } = await supabase
    .from("minha_empresa")
    .select("id, nome, tem_acesso")
    .maybeSingle();

  if (!empresa || !empresa.tem_acesso) {
    return { erro: "Sem acesso." };
  }

  const [
    { data: dre },
    { data: vendas },
    { data: contasPagar },
    { data: contasReceber },
    { data: cmvProdutos },
  ] = await Promise.all([
    supabase.rpc("dre_periodo", {
      p_empresa_id: empresa.id,
      p_inicio: inicio,
      p_fim: fim,
    }),
    supabase
      .from("vendas_diarias")
      .select("data, faturamento, num_atendimentos, canal")
      .gte("data", inicio)
      .lte("data", fim)
      .order("data"),
    supabase
      .from("contas_pagar")
      .select("descricao, fornecedor, valor, vencimento, status, grupo_dre")
      .gte("vencimento", inicio)
      .lte("vencimento", fim)
      .order("vencimento"),
    supabase
      .from("contas_receber")
      .select("descricao, cliente, valor, vencimento, status")
      .gte("vencimento", inicio)
      .lte("vencimento", fim)
      .order("vencimento"),
    supabase.rpc("cmv_por_produto", { p_empresa_id: empresa.id }),
  ]);

  const temDados =
    (vendas?.length ?? 0) > 0 ||
    (contasPagar?.length ?? 0) > 0 ||
    (contasReceber?.length ?? 0) > 0;

  return {
    empresaNome: empresa.nome,
    periodo: { inicio, fim },
    dre,
    vendasDiarias: vendas ?? [],
    contasPagar: contasPagar ?? [],
    contasReceber: contasReceber ?? [],
    cmvProdutos: (cmvProdutos ?? []).filter(
      (p: any) => Number(p.qtd_insumos) > 0
    ),
    temDados,
  };
}
