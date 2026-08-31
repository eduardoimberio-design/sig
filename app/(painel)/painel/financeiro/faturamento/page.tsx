import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ImportarFaturamento } from "./cliente";

export const dynamic = "force-dynamic";

export default async function FaturamentoPage() {
  const supabase = createClient();

  const { data: empresa } = await supabase
    .from("minha_empresa")
    .select("id, tem_acesso")
    .maybeSingle();

  if (!empresa) redirect("/login");
  if (!empresa.tem_acesso) redirect("/painel/acesso");

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/painel/financeiro"
          className="rotulo text-white/40 hover:text-cyan"
        >
          ← Financeiro
        </Link>
        <h1 className="titulo mt-2 text-3xl">Registrar faturamento</h1>
        <p className="mt-2 max-w-2xl text-sm text-white/50">
          Dois caminhos: enviar o relatório do seu sistema de vendas para o SIG
          ler, ou informar o total do período direto. Em ambos, nada entra sem
          você confirmar.
        </p>
      </div>

      <ImportarFaturamento />
    </div>
  );
}
