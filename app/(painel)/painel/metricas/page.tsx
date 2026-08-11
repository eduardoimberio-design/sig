import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PainelMetricas } from "./cliente";

export const dynamic = "force-dynamic";

export default async function MetricasPage() {
  const supabase = createClient();

  const { data: empresa } = await supabase
    .from("minha_empresa")
    .select("id, tem_acesso")
    .maybeSingle();

  if (!empresa) redirect("/login");
  if (!empresa.tem_acesso) redirect("/painel/acesso");

  // Primeiro e último lançamento existentes — usado para avisar o
  // cliente quando ele pede um período anterior ao histórico dele.
  const [{ data: primeira }, { data: ultima }] = await Promise.all([
    supabase
      .from("vendas_diarias")
      .select("data")
      .order("data", { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("vendas_diarias")
      .select("data")
      .order("data", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return (
    <div className="space-y-8">
      <header>
        <span className="rotulo text-cyan">Métricas</span>
        <h1 className="titulo mt-1 text-3xl font-semibold">
          Relatórios do negócio
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-white/50">
          Escolha qualquer período e exporte em Excel ou PDF. Os números são
          os mesmos que o Financeiro e o Estoque calculam — nada é recalculado
          de forma diferente aqui.
        </p>
      </header>

      <PainelMetricas
        primeiroLancamento={primeira?.data ?? null}
        ultimoLancamento={ultima?.data ?? null}
      />
    </div>
  );
}
