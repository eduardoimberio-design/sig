import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  moeda,
  percentual,
  data as fmtData,
  primeiroDiaMes,
  hoje,
  rotuloGrupo,
} from "@/lib/formatters";
import { marcarPago } from "@/app/actions/financeiro";
import { PainelLancamentos, GraficoFluxo } from "./cliente";
import { Pareto, type ItemPareto } from "./pareto";

export const dynamic = "force-dynamic";

export default async function FinanceiroPage({
  searchParams,
}: {
  searchParams: { inicio?: string; fim?: string };
}) {
  const supabase = createClient();

  const { data: empresa } = await supabase
    .from("minha_empresa")
    .select("id, tem_acesso, nome")
    .maybeSingle();

  if (!empresa) redirect("/login");
  if (!empresa.tem_acesso) redirect("/painel/acesso");

  const inicio = searchParams.inicio ?? primeiroDiaMes();
  const fim = searchParams.fim ?? hoje();

  // Marca contas vencidas antes de calcular qualquer coisa
  await supabase.rpc("atualizar_status_vencidos", { p_empresa_id: empresa.id });

  const [
    { data: dre },
    { data: fluxo },
    { data: alertas },
    { data: config },
    { data: despesas },
  ] = await Promise.all([
      supabase.rpc("dre_periodo", {
        p_empresa_id: empresa.id,
        p_inicio: inicio,
        p_fim: fim,
      }),
      supabase.rpc("fluxo_caixa", {
        p_empresa_id: empresa.id,
        p_inicio: inicio,
        p_fim: fim,
      }),
      supabase
        .from("alertas_financeiros")
        .select("*")
        .order("vencimento")
        .limit(12),
      supabase
        .from("config_financeiro")
        .select("meta_cmv_percentual")
        .maybeSingle(),
      supabase
        .from("contas_pagar")
        .select("fornecedor, descricao, valor, grupo_dre")
        .eq("empresa_id", empresa.id)
        .eq("status", "pago")
        .gte("vencimento", inicio)
        .lte("vencimento", fim),
    ]);

  // Agrupa por fornecedor e por natureza do gasto.
  // Sem fornecedor informado, a descrição serve de identificador.
  function agrupar(
    linhas: { fornecedor: string | null; descricao: string; valor: number; grupo_dre: string }[] | null,
    chave: "fornecedor" | "grupo_dre"
  ): ItemPareto[] {
    if (!linhas?.length) return [];
    const mapa = new Map<string, number>();
    for (const l of linhas) {
      const nome =
        chave === "fornecedor"
          ? l.fornecedor?.trim() || l.descricao
          : rotuloGrupo(l.grupo_dre);
      mapa.set(nome, (mapa.get(nome) ?? 0) + Number(l.valor));
    }
    return [...mapa.entries()]
      .map(([nome, valor]) => ({ nome, valor }))
      .sort((a, b) => b.valor - a.valor);
  }

  const paretoFornecedor = agrupar(despesas, "fornecedor");
  const paretoNatureza = agrupar(despesas, "grupo_dre");

  const metaCmv = Number(config?.meta_cmv_percentual ?? 30);
  const cmvAcimaDaMeta = dre && Number(dre.cmv_percentual) > metaCmv;
  const semDados = dre && Number(dre.receita_bruta) === 0;

  return (
    <div className="space-y-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="rotulo text-cyan">
            Agente Financeiro
          </span>
          <h1 className="titulo mt-1 text-3xl font-semibold">
            Resultado do período
          </h1>
        </div>

        <form className="flex items-end gap-3 text-sm">
          <label className="block">
            <span className="rotulo mb-2 block text-white/45">De</span>
            <input
              type="date"
              name="inicio"
              defaultValue={inicio}
              className="campo px-3 py-2"
            />
          </label>
          <label className="block">
            <span className="rotulo mb-2 block text-white/45">Até</span>
            <input
              type="date"
              name="fim"
              defaultValue={fim}
              className="campo px-3 py-2"
            />
          </label>
          <button className="rounded-sm border border-cyan px-4 py-2 text-cyan transition-colors hover:bg-cyan hover:text-white">
            Aplicar
          </button>
        </form>
      </header>

      {semDados ? (
        <div className="painel p-8 text-center">
          <p className="titulo text-xl text-ambar">
            Comece lançando seu faturamento
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm text-white/50">
            O DRE, o CMV e o ticket médio são calculados a partir das vendas do
            período. Registre pelo menos um dia de faturamento abaixo para ver
            os números.
          </p>
        </div>
      ) : (
        <>
          {/* Indicadores principais */}
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Indicador rotulo="Faturamento" valor={moeda(dre.receita_bruta)} />
            <Indicador
              rotulo="CMV"
              valor={percentual(dre.cmv_percentual)}
              apoio={`Meta: ${percentual(metaCmv)}`}
              alerta={cmvAcimaDaMeta}
            />
            <Indicador rotulo="Ticket médio" valor={moeda(dre.ticket_medio)} />
            <Indicador
              rotulo="Lucro líquido"
              valor={moeda(dre.lucro_liquido)}
              apoio={`Margem ${percentual(dre.margem_liquida)}`}
              alerta={Number(dre.lucro_liquido) < 0}
            />
          </section>

          {Number(dre.cmv) === 0 && Number(dre.receita_bruta) > 0 && (
            <p className="border-l-4 border border-alerta/40 bg-alerta/10 px-4 py-3 text-sm text-alerta">
              Nenhuma despesa quitada neste período — por isso a margem aparece
              tão alta. Marque as contas como pagas em "Próximos vencimentos"
              para que o resultado reflita a realidade.
            </p>
          )}

          {cmvAcimaDaMeta && (
            <p className="rounded-sm border border-ambar/40 bg-ambar/10 px-4 py-3 text-sm text-ambar-light">
              Seu CMV está {percentual(Number(dre.cmv_percentual) - metaCmv)}{" "}
              acima da meta. Em {moeda(dre.receita_bruta)} de faturamento, isso
              representa{" "}
              {moeda(
                (Number(dre.receita_bruta) *
                  (Number(dre.cmv_percentual) - metaCmv)) /
                  100
              )}{" "}
              de margem perdida no período.
            </p>
          )}

          {/* DRE */}
          <section>
            <h2 className="titulo mb-4 text-xl">
              Demonstrativo de resultado
            </h2>
            <div className="painel overflow-hidden">
              <table className="w-full text-sm">
                <tbody>
                  <LinhaDRE rotulo="Receita bruta" valor={dre.receita_bruta} />
                  <LinhaDRE rotulo="(−) Impostos" valor={-dre.impostos} />
                  <LinhaDRE rotulo="Receita líquida" valor={dre.receita_liquida} destaque />
                  <LinhaDRE rotulo="(−) Insumos (CMV)" valor={-dre.cmv} />
                  <LinhaDRE rotulo="Lucro bruto" valor={dre.lucro_bruto} destaque />
                  <LinhaDRE rotulo="(−) Pessoal" valor={-dre.pessoal} />
                  <LinhaDRE rotulo="(−) Despesas fixas" valor={-dre.despesa_fixa} />
                  <LinhaDRE rotulo="(−) Despesas variáveis" valor={-dre.despesa_variavel} />
                  <LinhaDRE rotulo="Resultado operacional" valor={dre.resultado_operacional} destaque />
                  <LinhaDRE rotulo="(−) Despesas financeiras" valor={-dre.despesa_financeira} />
                  <LinhaDRE rotulo="Lucro líquido" valor={dre.lucro_liquido} final />
                </tbody>
              </table>
            </div>
            {Number(dre.investimento) > 0 && (
              <p className="mt-2 text-xs text-white/40">
                {moeda(dre.investimento)} em investimentos não entram no
                resultado — são aplicação de capital, não despesa do período.
              </p>
            )}
          </section>

          {/* Fluxo de caixa */}
          {fluxo && fluxo.length > 0 && (
            <section>
              <h2 className="titulo mb-4 text-xl">Fluxo de caixa</h2>
              <GraficoFluxo dados={fluxo} />
            </section>
          )}
        </>
      )}

      {/* Concentração de gastos */}
      {paretoFornecedor.length > 0 && (
        <section>
          <h2 className="titulo mb-2 text-xl">Concentração de gastos</h2>
          <p className="mb-4 max-w-2xl text-xs leading-relaxed text-white/40">
            Onde o dinheiro realmente sai. Considera apenas contas já quitadas
            no período.
          </p>
          <div className="grid gap-4 lg:grid-cols-2">
            <Pareto
              itens={paretoFornecedor}
              titulo="Por fornecedor"
              vazio="Nenhuma despesa quitada no período."
            />
            <Pareto
              itens={paretoNatureza}
              titulo="Por natureza do gasto"
              vazio="Nenhuma despesa quitada no período."
            />
          </div>
        </section>
      )}

      {/* Alertas */}
      {alertas && alertas.length > 0 && (
        <section>
          <h2 className="titulo mb-2 text-xl">Próximos vencimentos</h2>
          <p className="mb-4 max-w-2xl text-xs leading-relaxed text-white/40">
            O resultado acima considera apenas o que já foi efetivamente pago
            ou recebido. Contas em aberto aparecem aqui, mas só entram no DRE
            quando forem quitadas.
          </p>
          <div className="space-y-2">
            {alertas.map((a) => {
              const atrasado = a.status === "atrasado";
              return (
                <div
                  key={`${a.tipo}-${a.id}`}
                  className={`flex flex-wrap items-center justify-between gap-3 rounded-sm border px-4 py-3 text-sm ${
                    atrasado
                      ? "border-negativo/40 bg-negativo/5"
                      : "border-base-border bg-base-surface"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`rotulo px-2 py-1 ${
                        a.tipo === "pagar"
                          ? "bg-white/10 text-white/55"
                          : "bg-cyan/15 text-cyan"
                      }`}
                    >
                      {a.tipo === "pagar" ? "Pagar" : "Receber"}
                    </span>
                    <span>{a.descricao}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-4">
                    <span className={atrasado ? "text-negativo" : "text-white/50"}>
                      {atrasado
                        ? `Venceu em ${fmtData(a.vencimento)}`
                        : a.dias_para_vencer === 0
                          ? "Vence hoje"
                          : `Em ${a.dias_para_vencer} dia${a.dias_para_vencer === 1 ? "" : "s"}`}
                    </span>
                    <span className="cifra">{moeda(a.valor)}</span>
                    <form action={marcarPago}>
                      <input type="hidden" name="id" value={a.id} />
                      <input
                        type="hidden"
                        name="tabela"
                        value={a.tipo === "pagar" ? "contas_pagar" : "contas_receber"}
                      />
                      <button
                        className="rotulo border border-positivo/50 bg-positivo/10 px-3 py-1.5
                                   text-positivo transition-colors hover:bg-positivo
                                   hover:text-base-bg"
                      >
                        {a.tipo === "pagar" ? "Paguei" : "Recebi"}
                      </button>
                    </form>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Lançamentos */}
      <PainelLancamentos />
    </div>
  );
}

function Indicador({
  rotulo,
  valor,
  apoio,
  alerta,
}: {
  rotulo: string;
  valor: string;
  apoio?: string;
  alerta?: boolean;
}) {
  return (
    <div className="painel p-5">
      <p className="rotulo text-white/40">{rotulo}</p>
      <p
        className={`cifra cifra-halo mt-3 text-2xl ${
          alerta ? "text-negativo" : "text-ambar"
        }`}
      >
        {valor}
      </p>
      {apoio && <p className="mt-1 text-xs text-white/40">{apoio}</p>}
    </div>
  );
}

function LinhaDRE({
  rotulo,
  valor,
  destaque,
  final,
}: {
  rotulo: string;
  valor: number;
  destaque?: boolean;
  final?: boolean;
}) {
  const negativo = Number(valor) < 0;
  return (
    <tr
      className={`border-b border-base-border last:border-0 ${
        final
          ? "bg-ambar/10"
          : destaque
            ? "bg-white/[0.03]"
            : ""
      }`}
    >
      <td className={`px-4 py-3 ${destaque || final ? "font-medium" : "text-white/70"}`}>
        {rotulo}
      </td>
      <td
        className={`px-4 py-3 text-right tabular-nums ${
          final
            ? negativo
              ? "text-negativo text-lg"
              : "text-ambar text-lg"
            : negativo
              ? "text-white/50"
              : "text-white"
        }`}
      >
        <span className="cifra">{moeda(valor)}</span>
      </td>
    </tr>
  );
}
