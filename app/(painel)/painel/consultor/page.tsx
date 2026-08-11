import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { primeiroDiaMes, hoje } from "@/lib/formatters";
import { FormGerarRelatorio, ListaRecomendacoes, RelatorioTexto } from "./cliente";

export const dynamic = "force-dynamic";

export default async function ConsultorPage() {
  const supabase = createClient();

  const { data: empresa } = await supabase
    .from("minha_empresa")
    .select("id, tem_acesso")
    .maybeSingle();

  if (!empresa) redirect("/login");
  if (!empresa.tem_acesso) redirect("/painel/acesso");

  const [{ data: ultimoRelatorio }, { data: recomendacoesPendentes }] =
    await Promise.all([
      supabase
        .from("relatorios_consultor")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("recomendacoes")
        .select("*")
        .eq("status", "pendente")
        .order("created_at", { ascending: false }),
    ]);

  const temChaveIA = !!process.env.ANTHROPIC_API_KEY;

  return (
    <div className="space-y-10">
      <header>
        <span className="rotulo text-cyan">Consultor IA</span>
        <h1 className="titulo mt-1 text-3xl font-semibold">
          Análise e recomendações
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-white/50">
          Lê o que os agentes Financeiro e Estoque já calcularam e traduz em
          recomendação prática — não coleta dado novo, interpreta o que existe.
        </p>
        <a
          href="/painel/consultor/conselheiro"
          className="rotulo mt-4 inline-block border border-cyan bg-cyan/10 px-5 py-2.5 text-cyan
                     transition-colors hover:bg-cyan hover:text-base-bg"
        >
          Abrir o Conselheiro — Ishikawa, 5 Porquês, 5W2H e SWOT
        </a>
      </header>

      {!temChaveIA && (
        <div className="border-l-4 border border-alerta/40 bg-alerta/10 px-4 py-3 text-sm text-alerta">
          Chave da Anthropic ainda não configurada — o relatório não pode ser
          gerado até isso ser resolvido no servidor.
        </div>
      )}

      <FormGerarRelatorio
        inicioPadrao={primeiroDiaMes()}
        fimPadrao={hoje()}
        habilitado={temChaveIA}
      />

      {recomendacoesPendentes && recomendacoesPendentes.length > 0 && (
        <section>
          <h2 className="titulo mb-4 text-xl">Recomendações pendentes</h2>
          <ListaRecomendacoes recomendacoes={recomendacoesPendentes} />
        </section>
      )}

      {ultimoRelatorio && (
        <section>
          <h2 className="titulo mb-4 text-xl">Último relatório</h2>
          <RelatorioTexto relatorio={ultimoRelatorio} />
        </section>
      )}

      {!ultimoRelatorio && (
        <div className="painel p-8 text-center">
          <p className="titulo text-lg text-ambar">
            Nenhum relatório gerado ainda
          </p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-white/50">
            Escolha um período acima e gere o primeiro relatório. Quanto mais
            dados lançados no Financeiro e no Estoque, mais preciso ele fica.
          </p>
        </div>
      )}
    </div>
  );
}
