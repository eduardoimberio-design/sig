import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { moeda, data as fmtData } from "@/lib/formatters";
import { sair } from "@/app/actions/auth";
import { FormVouchers, ListaEmpresas, ListaVouchers } from "./cliente";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // O acesso é verificado no banco (is_admin_sig) — se não for admin,
  // as funções retornam vazio ou erro, nunca dados de outra empresa.
  const { data: admin } = await supabase
    .from("admins_sig")
    .select("nome")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!admin) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <div className="painel max-w-md p-8 text-center">
          <p className="rotulo text-negativo">Acesso restrito</p>
          <p className="mt-3 text-sm text-white/60">
            Esta área é exclusiva para administradores do SIG.
          </p>
          <a
            href="/painel"
            className="rotulo mt-6 inline-block border border-cyan bg-cyan/10 px-5 py-2.5 text-cyan hover:bg-cyan hover:text-base-bg"
          >
            Voltar ao painel
          </a>
        </div>
      </main>
    );
  }

  const [{ data: metricas }, { data: empresas }, { data: vouchers }] =
    await Promise.all([
      supabase.rpc("admin_metricas"),
      supabase.rpc("admin_listar_empresas"),
      supabase.rpc("admin_listar_vouchers"),
    ]);

  return (
    <div className="min-h-screen">
      <header className="border-b border-base-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-baseline gap-3">
            <span className="titulo text-xl font-semibold text-ambar">SIG</span>
            <span className="rotulo text-cyan">Administração</span>
          </div>
          <div className="flex items-center gap-5 text-sm">
            <a href="/painel" className="text-white/50 hover:text-white/80">
              Meu painel
            </a>
            <form action={sair}>
              <button className="text-white/40 hover:text-white/70">Sair</button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-10 px-6 py-10">
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Indicador
            rotulo="Empresas ativas"
            valor={`${metricas?.empresas_ativas ?? 0}`}
            apoio={`${metricas?.total_empresas ?? 0} cadastradas`}
          />
          <Indicador
            rotulo="Expirando em 7 dias"
            valor={`${metricas?.expirando_7_dias ?? 0}`}
            alerta={Number(metricas?.expirando_7_dias ?? 0) > 0}
          />
          <Indicador
            rotulo="Receita 30 dias"
            valor={moeda(metricas?.receita_30_dias ?? 0)}
          />
          <Indicador
            rotulo="Receita total"
            valor={moeda(metricas?.receita_total ?? 0)}
          />
        </section>

        <section>
          <h2 className="titulo mb-4 text-xl">Empresas clientes</h2>
          <ListaEmpresas empresas={empresas ?? []} />
        </section>

        <section>
          <h2 className="titulo mb-4 text-xl">Gerar vouchers</h2>
          <FormVouchers />
        </section>

        <section>
          <h2 className="titulo mb-4 text-xl">Vouchers emitidos</h2>
          <ListaVouchers vouchers={vouchers ?? []} />
        </section>
      </main>
    </div>
  );
}

function Indicador({
  rotulo,
  valor,
  apoio,
  alerta,
}: {
  rotulo: string;
  valor: string;
  apoio?: string;
  alerta?: boolean;
}) {
  return (
    <div className="painel p-5">
      <p className="rotulo text-white/40">{rotulo}</p>
      <p
        className={`cifra cifra-halo mt-3 text-2xl ${
          alerta ? "text-alerta" : "text-ambar"
        }`}
      >
        {valor}
      </p>
      {apoio && <p className="mt-1 text-xs text-white/40">{apoio}</p>}
    </div>
  );
}
