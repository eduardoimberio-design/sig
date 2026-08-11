import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FormGerarConteudo, ListaConteudo, PainelConfigMarketing } from "./cliente";

export const dynamic = "force-dynamic";

export default async function MarketingPage({
  searchParams,
}: {
  searchParams: { config?: string };
}) {
  const supabase = createClient();

  const { data: empresa } = await supabase
    .from("minha_empresa")
    .select("id, tem_acesso")
    .maybeSingle();

  if (!empresa) redirect("/login");
  if (!empresa.tem_acesso) redirect("/painel/acesso");

  const [{ data: conteudos }, { data: config }, { data: produtos }] =
    await Promise.all([
      supabase
        .from("conteudo_marketing")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(30),
      supabase.from("config_marketing").select("*").maybeSingle(),
      supabase
        .from("produtos")
        .select("id")
        .eq("empresa_id", empresa.id)
        .eq("ativo_catalogo", true)
        .limit(1),
    ]);

  const temChaveIA = !!process.env.ANTHROPIC_API_KEY;
  const temCatalogo = (produtos?.length ?? 0) > 0;

  return (
    <div className="space-y-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="rotulo text-cyan">Agente de Marketing</span>
          <h1 className="titulo mt-1 text-3xl font-semibold">
            Conteúdo para redes sociais
          </h1>
        </div>
        <a
          href="?config=1"
          className="rotulo border border-base-border px-4 py-2 text-white/50 hover:text-white/80"
        >
          Preferências de tom
        </a>
      </header>

      {!temChaveIA && (
        <div className="border-l-4 border border-alerta/40 bg-alerta/10 px-4 py-3 text-sm text-alerta">
          Chave da Anthropic ainda não configurada — a geração de conteúdo não
          funciona até isso ser resolvido.
        </div>
      )}

      {!temCatalogo && (
        <div className="border-l-4 border border-alerta/40 bg-alerta/10 px-4 py-3 text-sm text-alerta">
          Nenhum produto cadastrado ainda. O conteúdo gerado será mais forte
          se houver pratos reais no catálogo — cadastre alguns no Agente de
          Estoque primeiro.
        </div>
      )}

      {searchParams.config === "1" ? (
        <PainelConfigMarketing config={config} />
      ) : (
        <>
          <FormGerarConteudo habilitado={temChaveIA} />
          <ListaConteudo conteudos={conteudos ?? []} />
        </>
      )}
    </div>
  );
}
