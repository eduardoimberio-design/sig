import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { marcarLidasPeloCliente } from "@/app/actions/suporte";
import { Conversa, FormMensagemCliente } from "@/components/suporte";

export const dynamic = "force-dynamic";

export default async function SuportePage() {
  const supabase = createClient();

  const { data: empresa } = await supabase
    .from("minha_empresa")
    .select("id, nome")
    .maybeSingle();

  if (!empresa) redirect("/login");

  const { data: mensagens } = await supabase
    .from("mensagens_suporte")
    .select("id, autor, autor_nome, conteudo, created_at")
    .order("created_at", { ascending: true });

  // Abrir a tela já conta como ler.
  await marcarLidasPeloCliente();

  return (
    <div className="space-y-8">
      <div>
        <p className="rotulo text-cyan">Falar com o SIG</p>
        <h1 className="titulo mt-2 text-3xl">Suporte</h1>
        <p className="mt-2 max-w-2xl text-sm text-white/50">
          Escreva aqui e alguém do SIG responde. Fica tudo registrado nesta
          conversa, então dá para retomar depois sem repetir o assunto.
        </p>
      </div>

      <FormMensagemCliente />

      <section>
        <p className="rotulo mb-4 text-white/45">Conversa</p>
        <Conversa mensagens={(mensagens ?? []) as any} />
      </section>
    </div>
  );
}
