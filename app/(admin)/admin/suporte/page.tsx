import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function quando(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AdminSuportePage() {
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

  const { data: caixa } = await supabase
    .from("caixa_suporte")
    .select("*")
    .order("ultima_em", { ascending: false });

  const conversas = caixa ?? [];
  const pendentes = conversas.filter((c: any) => c.nao_lidas > 0);

  return (
    <main className="mx-auto max-w-4xl space-y-8 px-6 py-10">
      <div>
        <Link href="/admin" className="rotulo text-white/40 hover:text-cyan">
          ← Admin
        </Link>
        <h1 className="titulo mt-2 text-3xl">Caixa de suporte</h1>
        <p className="mt-2 text-sm text-white/50">
          {pendentes.length > 0
            ? `${pendentes.length} conversa(s) esperando resposta.`
            : "Nenhuma conversa esperando resposta."}
        </p>
      </div>

      {conversas.length === 0 ? (
        <div className="painel p-6">
          <p className="text-sm text-white/45">
            Nenhum cliente escreveu ainda.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {conversas.map((c: any) => (
            <Link
              key={c.empresa_id}
              href={`/admin/suporte/${c.empresa_id}`}
              className="painel block p-5 transition-colors hover:border-cyan/40"
            >
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-white/80">{c.empresa_nome}</span>
                <div className="flex items-baseline gap-3">
                  {c.nao_lidas > 0 && (
                    <span className="rotulo border border-alerta px-2 py-0.5 text-xs text-alerta">
                      {c.nao_lidas} nova(s)
                    </span>
                  )}
                  <span className="text-xs text-white/30">
                    {quando(c.ultima_em)}
                  </span>
                </div>
              </div>
              <p className="mt-2 line-clamp-2 text-sm text-white/45">
                <span className="text-white/30">
                  {c.ultimo_autor === "sig" ? "SIG: " : "Cliente: "}
                </span>
                {c.ultimo_conteudo}
              </p>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
