import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FormUpload, DocumentoRevisao } from "./cliente";

export const dynamic = "force-dynamic";

export default async function DocumentosPage() {
  const supabase = createClient();

  const { data: empresa } = await supabase
    .from("minha_empresa")
    .select("id, tem_acesso")
    .maybeSingle();

  if (!empresa) redirect("/login");
  if (!empresa.tem_acesso) redirect("/painel/acesso");

  const [{ data: pendentes }, { data: insumos }] = await Promise.all([
    supabase
      .from("documentos_importados")
      .select("*, documento_itens(*)")
      .in("status", ["aguardando_revisao", "erro"])
      .order("created_at", { ascending: false }),
    supabase.from("insumos").select("id, nome, unidade_medida").order("nome"),
  ]);

  return (
    <div className="space-y-10">
      <header>
        <span className="rotulo text-cyan">Agente de Estoque</span>
        <h1 className="titulo mt-1 text-3xl font-semibold">
          Importar documentos
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-white/50">
          Envie o XML da nota fiscal sempre que possível — a leitura é exata e
          não usa IA. PDF e foto também funcionam, lidos por IA com precisão
          um pouco menor, por isso sempre pedem sua confirmação antes de
          lançar.
        </p>
      </header>

      <FormUpload />

      {pendentes && pendentes.length > 0 && (
        <section>
          <h2 className="titulo mb-4 text-xl">Aguardando revisão</h2>
          <div className="space-y-6">
            {pendentes.map((doc) => (
              <DocumentoRevisao
                key={doc.id}
                documento={doc}
                itens={doc.documento_itens ?? []}
                insumos={insumos ?? []}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
