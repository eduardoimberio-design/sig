import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { sair } from "@/app/actions/auth";

export const dynamic = "force-dynamic";

export default async function PainelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: empresa } = await supabase
    .from("minha_empresa")
    .select("*")
    .maybeSingle();

  // Usuário autenticado mas sem empresa: onboarding incompleto.
  if (!empresa) redirect("/cadastro");

  const { data: admin } = await supabase
    .from("admins_sig")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  // Mensagens do SIG que o cliente ainda não abriu.
  const { count: naoLidas } = await supabase
    .from("mensagens_suporte")
    .select("id", { count: "exact", head: true })
    .eq("autor", "sig")
    .eq("lida", false);

  const avisoExpiracao =
    !empresa.acesso_vitalicio &&
    empresa.tem_acesso &&
    empresa.dias_restantes !== null &&
    empresa.dias_restantes <= 7;

  return (
    <div className="min-h-screen">
      <header className="border-b border-base-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/painel" className="flex items-baseline gap-3">
            <span className="titulo text-xl font-semibold text-ambar">
              SIG
            </span>
            <span className="text-sm text-white/50">{empresa.nome}</span>
          </Link>

          <div className="flex items-center gap-5 text-sm">
            {admin && (
              <Link href="/admin" className="rotulo text-ambar hover:underline">
                Admin
              </Link>
            )}
            <Link
              href="/painel/suporte"
              className="flex items-baseline gap-2 text-white/60 hover:text-cyan"
            >
              Falar com o SIG
              {naoLidas ? (
                <span className="rotulo border border-alerta px-1.5 text-xs text-alerta">
                  {naoLidas}
                </span>
              ) : null}
            </Link>
            <Link href="/painel/acesso" className="text-white/60 hover:text-ambar">
              {empresa.acesso_vitalicio
                ? "Acesso vitalício"
                : empresa.tem_acesso
                  ? `${empresa.dias_restantes} dias restantes`
                  : "Ativar acesso"}
            </Link>
            <form action={sair}>
              <button className="text-white/40 hover:text-white/80">Sair</button>
            </form>
          </div>
        </div>
      </header>

      {avisoExpiracao && (
        <div className="border-b border-alerta/30 bg-alerta/10">
          <div className="mx-auto max-w-6xl px-6 py-3 text-sm text-alerta">
            Seu acesso expira em {empresa.dias_restantes}{" "}
            {empresa.dias_restantes === 1 ? "dia" : "dias"}.{" "}
            <Link href="/painel/acesso" className="underline">
              Renovar agora
            </Link>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
    </div>
  );
}
