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

  // Mensagens de cliente ainda sem resposta, para o contador do topo.
  const { count: mensagensPendentes } = await supabase
    .from("mensagens_suporte")
    .select("id", { count: "exact", head: true })
    .eq("autor", "cliente")
    .eq("lida", false);

  // Leads do diagnóstico ainda não contatados, para o contador do topo.
  const { data: leadsDiagnosticoNovos } = await supabase.rpc(
    "admin_contar_leads_diagnostico_novos"
  );

  // Estado do Sentinela: último relatório e falhas das últimas 24h.
  const ontem = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [{ data: ultimoResumo }, { count: falhasRecentes }] = await Promise.all([
    supabase
      .from("resumos_sentinela")
      .select("referencia, resumo, total_eventos, total_criticos, lido")
      .order("referencia", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("eventos_sistema")
      .select("id", { count: "exact", head: true })
      .gte("created_at", ontem),
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
            <a
              href="/admin/diagnosticos"
              className="flex items-baseline gap-2 text-white/50 hover:text-cyan"
            >
              Leads
              {leadsDiagnosticoNovos ? (
                <span className="rotulo border border-cyan px-1.5 text-xs text-cyan">
                  {leadsDiagnosticoNovos}
                </span>
              ) : null}
            </a>
            <a
              href="/admin/suporte"
              className="flex items-baseline gap-2 text-white/50 hover:text-cyan"
            >
              Suporte
              {mensagensPendentes ? (
                <span className="rotulo border border-alerta px-1.5 text-xs text-alerta">
                  {mensagensPendentes}
                </span>
              ) : null}
            </a>
            <a
              href="/admin/uso"
              className="text-white/50 hover:text-cyan"
            >
              Uso
            </a>
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

        {/* Leads do diagnóstico — atalho rápido para o topo de funil */}
        <section>
          <a
            href="/admin/diagnosticos"
            className="painel block p-6 transition-colors hover:border-cyan/40"
          >
            <div className="flex items-baseline justify-between gap-4">
              <span className="rotulo text-cyan">Leads do diagnóstico</span>
              {leadsDiagnosticoNovos ? (
                <span className="rotulo border border-cyan px-2 py-0.5 text-xs text-cyan">
                  {leadsDiagnosticoNovos} novo(s)
                </span>
              ) : (
                <span className="text-xs text-white/40">Nenhum lead novo</span>
              )}
            </div>
            <p className="mt-3 text-sm text-white/60">
              Ver todos os leads que preencheram o diagnóstico grátis, com indicadores
              financeiros calculados e status no funil comercial.
            </p>
          </a>
        </section>

        {/* Sentinela — vigia técnico. O alerta só aparece quando há
            ocorrência de verdade, para não virar ruído ignorado. */}
        <section>
          <a
            href="/admin/sentinela"
            className={`painel block p-6 transition-colors ${
              (falhasRecentes ?? 0) > 0
                ? "border-alerta/40 hover:border-alerta"
                : "hover:border-cyan/40"
            }`}
          >
            <div className="flex items-baseline justify-between gap-4">
              <span className="rotulo text-cyan">Sentinela</span>
              {(falhasRecentes ?? 0) > 0 ? (
                <span className="rotulo border border-alerta px-2 py-0.5 text-xs text-alerta">
                  {falhasRecentes} ocorrência(s) em 24h
                </span>
              ) : (
                <span className="text-xs text-positivo">
                  Nenhuma falha em 24h
                </span>
              )}
            </div>

            {ultimoResumo ? (
              <>
                <p className="mt-3 line-clamp-3 text-sm text-white/60">
                  {ultimoResumo.resumo}
                </p>
                <p className="mt-3 text-xs text-white/30">
                  Relatório de{" "}
                  {new Date(
                    ultimoResumo.referencia + "T12:00:00"
                  ).toLocaleDateString("pt-BR")}
                  {!ultimoResumo.lido && (
                    <span className="text-alerta"> · não lido</span>
                  )}
                </p>
              </>
            ) : (
              <p className="mt-3 text-sm text-white/45">
                Nenhum relatório ainda. O primeiro sai amanhã de manhã.
              </p>
            )}
          </a>
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
