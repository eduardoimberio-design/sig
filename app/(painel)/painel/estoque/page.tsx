import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { moeda, percentual } from "@/lib/formatters";
import {
  PainelInsumos,
  PainelProdutos,
  PainelEquipamentos,
} from "./cliente";

export const dynamic = "force-dynamic";

export default async function EstoquePage() {
  const supabase = createClient();

  const { data: empresa } = await supabase
    .from("minha_empresa")
    .select("id, tem_acesso")
    .maybeSingle();

  if (!empresa) redirect("/login");
  if (!empresa.tem_acesso) redirect("/painel/acesso");

  const [
    { data: cmv },
    { data: insumos },
    { data: produtos },
    { data: fichaItens },
    { data: equipamentos },
    { data: estoqueBaixo },
    { data: docsPendentes },
  ] = await Promise.all([
    supabase.rpc("cmv_por_produto", { p_empresa_id: empresa.id }),
    supabase.from("insumos").select("*").order("nome"),
    supabase.from("produtos").select("*").order("nome"),
    supabase
      .from("ficha_tecnica_itens")
      .select("id, produto_id, insumo_id, quantidade"),
    supabase.from("equipamentos").select("*").order("categoria"),
    supabase.from("insumos_estoque_baixo").select("*"),
    supabase
      .from("documentos_importados")
      .select("id")
      .eq("status", "aguardando_revisao"),
  ]);

  const cmvValidos = (cmv ?? []).filter((c) => Number(c.qtd_insumos) > 0);
  const cmvMedio =
    cmvValidos.length > 0
      ? cmvValidos.reduce((s, c) => s + Number(c.cmv_percentual), 0) /
        cmvValidos.length
      : null;

  return (
    <div className="space-y-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="rotulo text-cyan">Agente de Estoque</span>
          <h1 className="titulo mt-1 text-3xl font-semibold">
            Ficha técnica e CMV
          </h1>
        </div>

        <div className="flex gap-3">
          <Link
            href="/painel/estoque/questionario"
            className="rotulo border border-base-border px-5 py-2.5 text-white/50
                       transition-colors hover:text-white/80"
          >
            Questionário operacional
          </Link>
          <Link
            href="/painel/estoque/documentos"
            className="rotulo relative border border-cyan bg-cyan/10 px-5 py-2.5 text-cyan
                       transition-colors hover:bg-cyan hover:text-base-bg"
          >
            Importar documentos
            {docsPendentes && docsPendentes.length > 0 && (
              <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center
                               rounded-full bg-alerta px-1 text-[11px] font-bold text-base-bg">
                {docsPendentes.length}
              </span>
            )}
          </Link>
        </div>
      </header>

      {/* Indicadores */}
      <section className="grid gap-4 sm:grid-cols-3">
        <div className="painel p-5">
          <p className="rotulo text-white/40">CMV médio do cardápio</p>
          <p className="cifra cifra-halo mt-3 text-2xl text-ambar">
            {cmvMedio !== null ? percentual(cmvMedio) : "—"}
          </p>
        </div>
        <div className="painel p-5">
          <p className="rotulo text-white/40">Produtos com ficha técnica</p>
          <p className="cifra cifra-halo mt-3 text-2xl text-ambar">
            {cmvValidos.length} / {produtos?.length ?? 0}
          </p>
        </div>
        <div className="painel p-5">
          <p className="rotulo text-white/40">Insumos abaixo do mínimo</p>
          <p
            className={`cifra cifra-halo mt-3 text-2xl ${
              (estoqueBaixo?.length ?? 0) > 0 ? "text-negativo" : "text-positivo"
            }`}
          >
            {estoqueBaixo?.length ?? 0}
          </p>
        </div>
      </section>

      {estoqueBaixo && estoqueBaixo.length > 0 && (
        <div className="border-l-4 border border-negativo/40 bg-negativo/10 px-4 py-3 text-sm text-negativo">
          {estoqueBaixo.length === 1 ? (
            <>
              <strong>{estoqueBaixo[0].nome}</strong> está abaixo do estoque
              mínimo — faltam {estoqueBaixo[0].falta} {estoqueBaixo[0].unidade_medida}.
            </>
          ) : (
            <>
              {estoqueBaixo.length} insumos abaixo do estoque mínimo:{" "}
              {estoqueBaixo.map((i) => i.nome).join(", ")}.
            </>
          )}
        </div>
      )}

      {/* CMV por produto */}
      {cmvValidos.length > 0 && (
        <section>
          <h2 className="titulo mb-4 text-xl">CMV por produto</h2>
          <div className="painel overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-base-border text-left">
                  <th className="rotulo px-4 py-3 font-normal text-white/40">
                    Produto
                  </th>
                  <th className="rotulo px-4 py-3 text-right font-normal text-white/40">
                    Preço
                  </th>
                  <th className="rotulo px-4 py-3 text-right font-normal text-white/40">
                    Custo ficha
                  </th>
                  <th className="rotulo px-4 py-3 text-right font-normal text-white/40">
                    CMV
                  </th>
                  <th className="rotulo px-4 py-3 text-right font-normal text-white/40">
                    Margem
                  </th>
                </tr>
              </thead>
              <tbody>
                {cmvValidos.map((c) => {
                  const alto = Number(c.cmv_percentual) > 35;
                  return (
                    <tr key={c.produto_id} className="border-b border-base-border last:border-0">
                      <td className="px-4 py-3">{c.produto_nome}</td>
                      <td className="cifra px-4 py-3 text-right">
                        {moeda(c.preco_venda)}
                      </td>
                      <td className="cifra px-4 py-3 text-right text-white/60">
                        {moeda(c.custo_ficha)}
                      </td>
                      <td
                        className={`cifra px-4 py-3 text-right ${
                          alto ? "text-negativo" : "text-ambar"
                        }`}
                      >
                        {percentual(c.cmv_percentual)}
                      </td>
                      <td className="cifra px-4 py-3 text-right text-white/60">
                        {percentual(c.margem_percentual)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Insumos */}
      <PainelInsumos insumos={insumos ?? []} />

      {/* Produtos + ficha técnica */}
      <PainelProdutos
        produtos={produtos ?? []}
        insumos={insumos ?? []}
        fichaItens={fichaItens ?? []}
      />

      {/* Equipamentos */}
      <PainelEquipamentos equipamentos={equipamentos ?? []} />
    </div>
  );
}
