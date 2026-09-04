import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ListaInsumos, ListaProdutos } from "./cliente";

export const dynamic = "force-dynamic";

export default async function ItensEstoquePage({
  searchParams,
}: {
  searchParams: { q?: string; tipo?: string };
}) {
  const supabase = createClient();

  const { data: empresa } = await supabase
    .from("minha_empresa")
    .select("id, tem_acesso")
    .maybeSingle();

  if (!empresa) redirect("/login");
  if (!empresa.tem_acesso) redirect("/painel/acesso");

  const busca = (searchParams.q ?? "").trim();
  const tipo = searchParams.tipo === "produtos" ? "produtos" : "insumos";

  let insumos: any[] = [];
  let produtos: any[] = [];

  if (tipo === "insumos") {
    let q = supabase
      .from("insumos")
      .select(
        "id, nome, unidade_medida, custo_unitario, estoque_atual, estoque_minimo, fornecedor_principal"
      )
      .order("nome")
      .limit(300);

    if (busca) {
      q = q.or(`nome.ilike.%${busca}%,fornecedor_principal.ilike.%${busca}%`);
    }

    const { data } = await q;
    insumos = data ?? [];
  } else {
    let q = supabase
      .from("produtos")
      .select(
        `id, nome, categoria, preco_venda,
         ficha:ficha_tecnica_itens(
           id, quantidade,
           insumo:insumos(nome, unidade_medida, custo_unitario)
         )`
      )
      .order("nome")
      .limit(200);

    if (busca) q = q.or(`nome.ilike.%${busca}%,categoria.ilike.%${busca}%`);

    const { data } = await q;
    produtos = data ?? [];
  }

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/painel/estoque"
          className="rotulo text-white/40 hover:text-cyan"
        >
          ← Estoque
        </Link>
        <h1 className="titulo mt-2 text-3xl">Buscar e corrigir itens</h1>
        <p className="mt-2 max-w-2xl text-sm text-white/50">
          O custo do insumo é atualizado automaticamente pelas notas
          importadas. Se a leitura trouxer um valor errado, corrija aqui — é
          esse número que forma o CMV de cada produto.
        </p>
      </div>

      <form className="painel p-5">
        <div className="flex flex-wrap items-end gap-4">
          <label className="min-w-[240px] flex-1">
            <span className="rotulo mb-2 block text-white/45">Buscar</span>
            <input
              name="q"
              defaultValue={busca}
              placeholder="Nome do insumo, produto ou fornecedor"
              className="campo w-full px-4 py-2.5 text-sm placeholder-white/25"
            />
          </label>

          <div className="flex gap-2">
            {[
              { valor: "insumos", rotulo: "Insumos" },
              { valor: "produtos", rotulo: "Produtos e fichas" },
            ].map((t) => (
              <label key={t.valor} className="cursor-pointer">
                <input
                  type="radio"
                  name="tipo"
                  value={t.valor}
                  defaultChecked={tipo === t.valor}
                  className="peer sr-only"
                />
                <span
                  className="rotulo block border border-base-border px-3 py-2.5 text-xs
                             text-white/50 transition-colors peer-checked:border-cyan
                             peer-checked:text-cyan hover:border-cyan/50"
                >
                  {t.rotulo}
                </span>
              </label>
            ))}
          </div>

          <button
            type="submit"
            className="rotulo border border-cyan bg-cyan/10 px-5 py-2.5 text-cyan
                       transition-colors hover:bg-cyan hover:text-base-bg"
          >
            Buscar
          </button>
        </div>
      </form>

      <div>
        <p className="rotulo mb-4 text-white/45">
          {tipo === "insumos"
            ? `${insumos.length} insumo(s)`
            : `${produtos.length} produto(s)`}
        </p>

        {tipo === "insumos" ? (
          <ListaInsumos insumos={insumos as any} />
        ) : (
          <ListaProdutos produtos={produtos as any} />
        )}
      </div>
    </div>
  );
}
