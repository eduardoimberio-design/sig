import { createAdminClient } from "@/lib/supabase/admin";
import { montarContextoAnexos } from "@/lib/anexos-contexto";

/**
 * Resumo leve do negócio — não é a análise completa do Consultor
 * (que já existe em consultor-dados.ts), é um contexto compacto
 * para ancorar o raciocínio do Conselheiro em fatos reais, sem
 * custar uma consulta pesada a cada geração.
 */
export async function montarContextoNegocio(empresaId: string): Promise<string> {
  const admin = createAdminClient();

  const hoje = new Date().toISOString().slice(0, 10);
  const trintaDiasAtras = new Date();
  trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);
  const inicio = trintaDiasAtras.toISOString().slice(0, 10);

  const [
    { data: dre },
    { data: colaboradores },
    { data: equipamentos },
    { data: estoqueBaixo },
    { data: cmvProdutos },
  ] = await Promise.all([
    admin.rpc("dre_periodo", { p_empresa_id: empresaId, p_inicio: inicio, p_fim: hoje }),
    admin.from("colaboradores").select("nome, funcao, nivel_qualificacao").eq("empresa_id", empresaId).eq("ativo", true),
    admin.from("equipamentos").select("tipo, dominio_equipe, restricoes").eq("empresa_id", empresaId),
    admin.from("insumos_estoque_baixo").select("nome").eq("empresa_id", empresaId),
    admin.rpc("cmv_por_produto", { p_empresa_id: empresaId }),
  ]);

  const partes: string[] = [];

  if (dre && Number(dre.receita_bruta) > 0) {
    partes.push(
      `Últimos 30 dias: faturamento ${Number(dre.receita_bruta).toFixed(2)}, CMV ${Number(dre.cmv_percentual).toFixed(1)}%, ticket médio ${Number(dre.ticket_medio).toFixed(2)}, margem líquida ${Number(dre.margem_liquida).toFixed(1)}%.`
    );
  }

  if (colaboradores && colaboradores.length > 0) {
    partes.push(
      `Equipe: ${colaboradores.map((c) => `${c.nome} (${c.funcao}${c.nivel_qualificacao ? `, ${c.nivel_qualificacao}` : ""})`).join("; ")}.`
    );
  }

  if (equipamentos && equipamentos.length > 0) {
    const comRestricao = equipamentos.filter((e) => e.dominio_equipe === "baixo" || e.restricoes);
    if (comRestricao.length > 0) {
      partes.push(
        `Equipamentos com restrição: ${comRestricao.map((e) => `${e.tipo}${e.restricoes ? ` (${e.restricoes})` : " (baixo domínio da equipe)"}`).join("; ")}.`
      );
    }
  }

  if (estoqueBaixo && estoqueBaixo.length > 0) {
    partes.push(`Insumos abaixo do estoque mínimo agora: ${estoqueBaixo.map((i) => i.nome).join(", ")}.`);
  }

  const produtosCmvAlto = (cmvProdutos ?? []).filter(
    (p: any) => Number(p.qtd_insumos) > 0 && Number(p.cmv_percentual) > 35
  );
  if (produtosCmvAlto.length > 0) {
    partes.push(
      `Produtos com CMV acima de 35%: ${produtosCmvAlto.map((p: any) => `${p.produto_nome} (${Number(p.cmv_percentual).toFixed(1)}%)`).join(", ")}.`
    );
  }

  const anexos = await montarContextoAnexos(empresaId, "conselheiro");
  if (anexos) partes.push("\n" + anexos);

  return partes.length > 0
    ? partes.join("\n")
    : "Ainda não há dados suficientes lançados no sistema — baseie-se apenas no que o cliente descreveu.";
}
