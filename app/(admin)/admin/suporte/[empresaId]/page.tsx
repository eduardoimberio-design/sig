import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Conversa, FormRespostaSig } from "@/components/suporte";

export const dynamic = "force-dynamic";

export default async function AdminConversaPage({
  params,
}: {
  params: { empresaId: string };
}) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: admin } = await supabase
    .from("admins_sig")
    .select("nome")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!admin) redirect("/painel");

  const { data: empresa } = await supabase
    .from("empresas")
    .select("nome")
    .eq("id", params.empresaId)
    .maybeSingle();

  const { data: mensagens } = await supabase
    .from("mensagens_suporte")
    .select("id, autor, autor_nome, conteudo, created_at")
    .eq("empresa_id", params.empresaId)
    .order("created_at", { ascending: true });

  return (
    <main className="mx-auto max-w-3xl space-y-8 px-6 py-10">
      <div>
        <Link
          href="/admin/suporte"
          className="rotulo text-white/40 hover:text-cyan"
        >
          ← Caixa de suporte
        </Link>
        <h1 className="titulo mt-2 text-3xl">
          {empresa?.nome ?? "Conversa"}
        </h1>
      </div>

      <section className="painel p-6">
        <Conversa
          mensagens={(mensagens ?? []) as any}
          ladoDoSig
          nomeCliente={empresa?.nome}
        />
        <FormRespostaSig empresaId={params.empresaId} />
      </section>
    </main>
  );
}
