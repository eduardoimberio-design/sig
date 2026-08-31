import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ListaLancamentos, type Lancamento } from "./cliente";

export const dynamic = "force-dynamic";

const TIPOS = [
  { valor: "todos", rotulo: "Tudo" },
  { valor: "pagar", rotulo: "A pagar" },
  { valor: "receber", rotulo: "A receber" },
  { valor: "venda", rotulo: "Faturamento" },
];

export default async function LancamentosPage({
  searchParams,
}: {
  searchParams: { q?: string; tipo?: string; de?: string; ate?: string };
}) {
  const supabase = createClient();

  const { data: empresa } = await supabase
    .from("minha_empresa")
    .select("id, tem_acesso")
    .maybeSingle();

  if (!empresa) redirect("/login");
  if (!empresa.tem_acesso) redirect("/painel/acesso");

  const busca = (searchParams.q ?? "").trim();
  const tipo = searchParams.tipo ?? "todos";
  const de = searchParams.de ?? "";
  const ate = searchParams.ate ?? "";

  const lancamentos: Lancamento[] = [];

  // Conta a pagar
  if (tipo === "todos" || tipo === "pagar") {
    let q = supabase
      .from("contas_pagar")
      .select("id, descricao, valor, vencimento, fornecedor, grupo_dre, status")
      .order("vencimento", { ascending: false })
      .limit(200);

    if (busca) q = q.or(`descricao.ilike.%${busca}%,fornecedor.ilike.%${busca}%`);
    if (de) q = q.gte("vencimento", de);
    if (ate) q = q.lte("vencimento", ate);

    const { data } = await q;
    for (const c of data ?? []) {
      lancamentos.push({
        id: c.id,
        tipo: "pagar",
        descricao: c.descricao,
        valor: Number(c.valor),
        data: c.vencimento,
        contraparte: c.fornecedor,
        grupo_dre: c.grupo_dre,
        status: c.status,
      });
    }
  }

  // Conta a receber
  if (tipo === "todos" || tipo === "receber") {
    let q = supabase
      .from("contas_receber")
      .select("id, descricao, valor, vencimento, cliente, status")
      .order("vencimento", { ascending: false })
      .limit(200);

    if (busca) q = q.or(`descricao.ilike.%${busca}%,cliente.ilike.%${busca}%`);
    if (de) q = q.gte("vencimento", de);
    if (ate) q = q.lte("vencimento", ate);

    const { data } = await q;
    for (const c of data ?? []) {
      lancamentos.push({
        id: c.id,
        tipo: "receber",
        descricao: c.descricao,
        valor: Number(c.valor),
        data: c.vencimento,
        contraparte: c.cliente,
        grupo_dre: null,
        status: c.status,
      });
    }
  }

  // Faturamento diário
  if (tipo === "todos" || tipo === "venda") {
    let q = supabase
      .from("vendas_diarias")
      .select("id, data, faturamento, num_atendimentos, canal")
      .order("data", { ascending: false })
      .limit(200);

    if (busca) q = q.ilike("canal", `%${busca}%`);
    if (de) q = q.gte("data", de);
    if (ate) q = q.lte("data", ate);

    const { data } = await q;
    for (const v of data ?? []) {
      lancamentos.push({
        id: v.id,
        tipo: "venda",
        descricao: `Faturamento do dia${v.canal ? ` — ${v.canal}` : ""}`,
        valor: Number(v.faturamento),
        data: v.data,
        contraparte: v.canal,
        grupo_dre: null,
        status: null,
        num_atendimentos: v.num_atendimentos,
      });
    }
  }

  // Mais recente primeiro, misturando as três origens.
  lancamentos.sort((a, b) => b.data.localeCompare(a.data));

  const total = lancamentos.reduce((s, l) => s + l.valor, 0);

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/painel/financeiro"
          className="rotulo text-white/40 hover:text-cyan"
        >
          ← Financeiro
        </Link>
        <h1 className="titulo mt-2 text-3xl">Buscar e corrigir lançamentos</h1>
        <p className="mt-2 max-w-2xl text-sm text-white/50">
          Achou um valor errado? Clique no lançamento para corrigir. A mudança
          entra na hora no DRE, no CMV e no painel de desempenho.
        </p>
      </div>

      <form className="painel p-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block lg:col-span-2">
            <span className="rotulo mb-2 block text-white/45">Buscar</span>
            <input
              name="q"
              defaultValue={busca}
              placeholder="Descrição, fornecedor ou cliente"
              className="campo w-full px-4 py-2.5 text-sm placeholder-white/25"
            />
          </label>

          <label className="block">
            <span className="rotulo mb-2 block text-white/45">De</span>
            <input
              name="de"
              type="date"
              defaultValue={de}
              className="campo w-full px-4 py-2.5 text-sm"
            />
          </label>

          <label className="block">
            <span className="rotulo mb-2 block text-white/45">Até</span>
            <input
              name="ate"
              type="date"
              defaultValue={ate}
              className="campo w-full px-4 py-2.5 text-sm"
            />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {TIPOS.map((t) => (
            <label key={t.valor} className="cursor-pointer">
              <input
                type="radio"
                name="tipo"
                value={t.valor}
                defaultChecked={tipo === t.valor}
                className="peer sr-only"
              />
              <span
                className="rotulo block border border-base-border px-3 py-1.5 text-xs
                           text-white/50 transition-colors peer-checked:border-cyan
                           peer-checked:text-cyan hover:border-cyan/50"
              >
                {t.rotulo}
              </span>
            </label>
          ))}

          <button
            type="submit"
            className="rotulo ml-auto border border-cyan bg-cyan/10 px-5 py-2 text-cyan
                       transition-colors hover:bg-cyan hover:text-base-bg"
          >
            Buscar
          </button>
        </div>
      </form>

      <div>
        <div className="mb-4 flex items-baseline justify-between gap-4">
          <p className="rotulo text-white/45">
            {lancamentos.length} lançamento(s)
          </p>
          <p className="text-sm text-white/35">
            Soma:{" "}
            <span className="cifra text-ambar">
              {total.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </span>
          </p>
        </div>

        <ListaLancamentos lancamentos={lancamentos} />

        {lancamentos.length >= 200 && (
          <p className="mt-4 text-xs text-white/30">
            Mostrando os 200 mais recentes de cada tipo. Use o filtro de data
            para chegar a lançamentos mais antigos.
          </p>
        )}
      </div>
    </div>
  );
}
