import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PainelConversas, PainelConfig } from "./cliente";

export const dynamic = "force-dynamic";

export default async function ComercialPage({
  searchParams,
}: {
  searchParams: { conversa?: string; config?: string };
}) {
  const supabase = createClient();

  const { data: empresa } = await supabase
    .from("minha_empresa")
    .select("id, tem_acesso, nome")
    .maybeSingle();

  if (!empresa) redirect("/login");
  if (!empresa.tem_acesso) redirect("/painel/acesso");

  const [{ data: config }, { data: conversas }, { data: dadosEmpresa }] =
    await Promise.all([
      supabase.from("config_comercial").select("*").maybeSingle(),
      supabase
        .from("conversas_whatsapp")
        .select("*")
        .order("ultima_mensagem_em", { ascending: false })
        .limit(50),
      supabase
        .from("empresas")
        .select("whatsapp_numero, whatsapp_channel_id")
        .eq("id", empresa.id)
        .single(),
    ]);

  const mostrarConfig = searchParams.config === "1";
  const conversaId = searchParams.conversa ?? conversas?.[0]?.id ?? null;

  let mensagens: any[] = [];
  if (conversaId) {
    const { data } = await supabase
      .from("mensagens_whatsapp")
      .select("*")
      .eq("conversa_id", conversaId)
      .order("created_at", { ascending: true });
    mensagens = data ?? [];
  }

  const conversaAtual = conversas?.find((c) => c.id === conversaId) ?? null;
  const canalConectado = !!dadosEmpresa?.whatsapp_channel_id;

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="rotulo text-cyan">Agente Comercial</span>
          <h1 className="titulo mt-1 text-3xl font-semibold">WhatsApp</h1>
        </div>
        <a
          href="?config=1"
          className="rotulo border border-base-border px-4 py-2 text-white/50 hover:text-white/80"
        >
          Configurar agente
        </a>
      </header>

      {!canalConectado && (
        <div className="mb-6 border-l-4 border border-alerta/40 bg-alerta/10 px-4 py-3 text-sm text-alerta">
          Nenhum número de WhatsApp conectado ainda. Depois que sua conta na
          360dialog for aprovada, me passe a API Key e o Channel ID para eu
          concluir a conexão.
        </div>
      )}

      {mostrarConfig ? (
        <PainelConfig config={config} />
      ) : (
        <PainelConversas
          conversas={conversas ?? []}
          conversaAtual={conversaAtual}
          mensagens={mensagens}
          empresaNome={empresa.nome}
        />
      )}
    </div>
  );
}
