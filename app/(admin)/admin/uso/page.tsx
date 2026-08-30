import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const NOME_MODULO: Record<string, string> = {
  inicio: "Painel inicial",
  financeiro: "Financeiro",
  estoque: "Estoque",
  marketing: "Marketing",
  consultor: "Consultor IA",
  equipe: "Equipe",
  metricas: "Métricas",
  suporte: "Suporte",
  acesso: "Acesso e planos",
  comercial: "Comercial",
  outro: "Outras telas",
};

function data(iso: string | null) {
  if (!iso) return "nunca entrou";
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

function corInatividade(dias: number | null) {
  if (dias === null) return "text-white/30";
  if (dias <= 3) return "text-positivo";
  if (dias <= 14) return "text-alerta";
  return "text-negativo";
}

export default async function AdminUsoPage() {
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

  const [{ data: porEmpresa }, { data: porModulo }] = await Promise.all([
    supabase.rpc("admin_uso_empresas", { p_dias: 30 }),
    supabase.rpc("admin_uso_modulos", { p_dias: 30 }),
  ]);

  const empresas = porEmpresa ?? [];
  const modulos = porModulo ?? [];

  const totalVisitas = modulos.reduce(
    (s: number, m: any) => s + Number(m.visitas),
    0
  );

  const nuncaUsaram = empresas.filter((e: any) => e.visitas === 0).length;
  const ativas7 = empresas.filter(
    (e: any) => e.dias_sem_acessar !== null && e.dias_sem_acessar <= 7
  ).length;

  return (
    <main className="mx-auto max-w-5xl space-y-8 px-6 py-10">
      <div>
        <Link href="/admin" className="rotulo text-white/40 hover:text-cyan">
          ← Admin
        </Link>
        <h1 className="titulo mt-2 text-3xl">Uso do sistema</h1>
        <p className="mt-2 max-w-2xl text-sm text-white/50">
          Quem está usando, com que frequência e quais agentes realmente
          entraram na rotina. Últimos 30 dias. Aqui não há nada financeiro nem
          conteúdo dos clientes — só navegação.
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="painel p-5">
          <p className="rotulo text-white/45">Ativas nos últimos 7 dias</p>
          <p className="cifra mt-2 text-3xl text-cyan">{ativas7}</p>
          <p className="mt-1 text-xs text-white/30">
            de {empresas.length} empresas
          </p>
        </div>
        <div className="painel p-5">
          <p className="rotulo text-white/45">Sem nenhum uso em 30 dias</p>
          <p
            className={`cifra mt-2 text-3xl ${nuncaUsaram > 0 ? "text-alerta" : "text-positivo"}`}
          >
            {nuncaUsaram}
          </p>
          <p className="mt-1 text-xs text-white/30">
            candidatas a abandono
          </p>
        </div>
        <div className="painel p-5">
          <p className="rotulo text-white/45">Telas abertas</p>
          <p className="cifra mt-2 text-3xl text-white/80">{totalVisitas}</p>
          <p className="mt-1 text-xs text-white/30">no período</p>
        </div>
      </section>

      <section>
        <h2 className="titulo mb-1 text-xl">Onde eles passam o tempo</h2>
        <p className="mb-4 text-sm text-white/45">
          Percentual de todas as telas abertas. Módulo com pouco uso pode
          significar pouca utilidade ou dificuldade de entender.
        </p>

        {modulos.length === 0 ? (
          <div className="painel p-5">
            <p className="text-sm text-white/45">
              Nenhuma navegação registrada ainda. Os dados começam a aparecer
              conforme os clientes usarem o sistema.
            </p>
          </div>
        ) : (
          <div className="painel space-y-3 p-6">
            {modulos.map((m: any) => {
              const pct =
                totalVisitas > 0
                  ? (Number(m.visitas) * 100) / totalVisitas
                  : 0;
              return (
                <div key={m.modulo}>
                  <div className="mb-1 flex items-baseline justify-between gap-4 text-sm">
                    <span className="text-white/70">
                      {NOME_MODULO[m.modulo] ?? m.modulo}
                    </span>
                    <span className="text-white/40">
                      {pct.toFixed(1)}%
                      <span className="text-white/25">
                        {" "}
                        · {m.empresas} empresa(s)
                      </span>
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-base-raised">
                    <div
                      className="h-full bg-cyan"
                      style={{ width: `${Math.max(pct, 1)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <h2 className="titulo mb-1 text-xl">Por cliente</h2>
        <p className="mb-4 text-sm text-white/45">
          Quem parou de entrar é quem está prestes a cancelar.
        </p>

        <div className="space-y-2">
          {empresas.map((e: any) => (
            <div key={e.empresa_id} className="painel p-5">
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-white/80">{e.empresa_nome}</span>
                <span
                  className={`text-sm ${corInatividade(e.dias_sem_acessar)}`}
                >
                  {e.dias_sem_acessar === null
                    ? "nunca entrou"
                    : e.dias_sem_acessar === 0
                      ? "entrou hoje"
                      : `há ${e.dias_sem_acessar} dia(s)`}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-white/40">
                <span>Último acesso: {data(e.ultimo_acesso)}</span>
                <span>{e.visitas} tela(s) aberta(s)</span>
                <span>{e.dias_ativos} dia(s) com uso</span>
                <span>{e.usuarios_ativos} usuário(s)</span>
                {e.modulo_top && (
                  <span className="text-cyan/60">
                    Mais usa: {NOME_MODULO[e.modulo_top] ?? e.modulo_top}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
