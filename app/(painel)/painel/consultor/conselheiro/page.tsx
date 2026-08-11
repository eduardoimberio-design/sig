import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FormNovoCaso, ListaCasos } from "./cliente";

export const dynamic = "force-dynamic";

export default async function ConselheiroPage() {
  const supabase = createClient();

  const { data: empresa } = await supabase
    .from("minha_empresa")
    .select("id, tem_acesso")
    .maybeSingle();

  if (!empresa) redirect("/login");
  if (!empresa.tem_acesso) redirect("/painel/acesso");

  const { data: casos } = await supabase
    .from("casos_conselheiro")
    .select("*")
    .order("created_at", { ascending: false });

  const temChaveIA = !!process.env.ANTHROPIC_API_KEY;

  return (
    <div className="space-y-8">
      <header>
        <a
          href="/painel/consultor"
          className="rotulo mb-4 inline-block text-white/40 hover:text-white/70"
        >
          ← Consultor IA
        </a>
        <span className="rotulo text-cyan">Conselheiro</span>
        <h1 className="titulo mt-1 text-3xl font-semibold">
          Diagnóstico e decisão estruturada
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-white/50">
          Traga um problema ou uma decisão. Ishikawa e 5 Porquês ajudam a
          achar a causa raiz; 5W2H transforma isso em plano de ação; SWOT
          apoia decisões estratégicas mais amplas.
        </p>
      </header>

      {!temChaveIA && (
        <div className="border-l-4 border border-alerta/40 bg-alerta/10 px-4 py-3 text-sm text-alerta">
          Chave da Anthropic ainda não configurada — a geração automática não
          funciona até isso ser resolvido.
        </div>
      )}

      <FormNovoCaso habilitado={temChaveIA} />

      <ListaCasos casos={casos ?? []} />
    </div>
  );
}
