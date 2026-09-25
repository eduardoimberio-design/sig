import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { moeda } from "@/lib/formatters";
import {
  aprovarAfiliado,
  suspenderAfiliado,
  marcarComissoesPagas,
} from "@/app/actions/afiliados";

export const dynamic = "force-dynamic";

const COR_STATUS: Record<string, string> = {
  pendente: "text-alerta border-alerta",
  ativo: "text-positivo border-positivo",
  suspenso: "text-negativo border-negativo",
};

export default async function AdminAfiliadosPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: admin } = await supabase
    .from("admins_sig")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!admin) redirect("/painel");

  const [{ data: afiliados }, { data: comissoes }, { data: indicadas }] =
    await Promise.all([
      supabase.from("afiliados").select("*").order("created_at", { ascending: false }),
      supabase.from("comissoes").select("afiliado_id, valor_comissao, status"),
      supabase.from("empresas").select("afiliado_id").not("afiliado_id", "is", null),
    ]);

  const porAfiliado = new Map<
    string,
    { pendente: number; pago: number; clientes: number }
  >();

  for (const a of afiliados ?? []) {
    porAfiliado.set(a.id, { pendente: 0, pago: 0, clientes: 0 });
  }
  for (const c of comissoes ?? []) {
    const r = porAfiliado.get(c.afiliado_id);
    if (!r) continue;
    if (c.status === "pendente") r.pendente += Number(c.valor_comissao);
    if (c.status === "paga") r.pago += Number(c.valor_comissao);
  }
  for (const e of indicadas ?? []) {
    const r = porAfiliado.get(e.afiliado_id);
    if (r) r.clientes += 1;
  }

  const totalPendente = [...porAfiliado.values()].reduce(
    (s, r) => s + r.pendente,
    0
  );
  const pendentesAprovacao = (afiliados ?? []).filter(
    (a: any) => a.status === "pendente"
  ).length;

  return (
    <main className="mx-auto max-w-5xl space-y-8 px-6 py-10">
      <div>
        <Link href="/admin" className="rotulo text-white/40 hover:text-cyan">
          ← Admin
        </Link>
        <h1 className="titulo mt-2 text-3xl">Afiliados</h1>
        <p className="mt-2 max-w-2xl text-sm text-white/50">
          Aprove cadastros, acompanhe indicações e registre os repasses. O
          sistema calcula quanto é devido — o Pix é feito por você.
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="painel p-5">
          <p className="rotulo text-white/45">A repassar</p>
          <p className="cifra mt-2 text-3xl text-ambar">{moeda(totalPendente)}</p>
        </div>
        <div className="painel p-5">
          <p className="rotulo text-white/45">Aguardando aprovação</p>
          <p
            className={`cifra mt-2 text-3xl ${pendentesAprovacao > 0 ? "text-alerta" : "text-white/60"}`}
          >
            {pendentesAprovacao}
          </p>
        </div>
        <div className="painel p-5">
          <p className="rotulo text-white/45">Afiliados</p>
          <p className="cifra mt-2 text-3xl text-white/80">
            {(afiliados ?? []).length}
          </p>
        </div>
      </section>

      {(afiliados ?? []).length === 0 ? (
        <div className="painel p-6">
          <p className="text-sm text-white/45">
            Nenhum afiliado ainda. A página de cadastro é{" "}
            <span className="text-cyan">/afiliados</span>.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {(afiliados ?? []).map((a: any) => {
            const r = porAfiliado.get(a.id)!;
            return (
              <div key={a.id} className="painel p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-4">
                  <div>
                    <p className="text-white/85">{a.nome}</p>
                    <p className="mt-0.5 text-xs text-white/40">
                      {a.profissao ?? "—"} · {a.email}
                      {a.whatsapp ? ` · ${a.whatsapp}` : ""}
                    </p>
                  </div>
                  <span
                    className={`rotulo border px-2 py-0.5 text-xs ${COR_STATUS[a.status]}`}
                  >
                    {a.status}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap gap-x-8 gap-y-2 text-sm">
                  <span className="text-white/45">
                    Código{" "}
                    <span className="cifra text-ambar">{a.codigo ?? "—"}</span>
                  </span>
                  <span className="text-white/45">
                    Clientes <span className="text-white/80">{r.clientes}</span>
                  </span>
                  <span className="text-white/45">
                    A repassar{" "}
                    <span className="cifra text-ambar">{moeda(r.pendente)}</span>
                  </span>
                  <span className="text-white/45">
                    Pago <span className="cifra text-positivo">{moeda(r.pago)}</span>
                  </span>
                </div>

                <p className="mt-3 text-xs text-white/40">
                  Pix:{" "}
                  {a.chave_pix ? (
                    <span className="text-white/70">{a.chave_pix}</span>
                  ) : (
                    <span className="text-alerta">não cadastrada</span>
                  )}
                  {a.documento ? ` · Documento ${a.documento}` : ""}
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  {a.status !== "ativo" && (
                    <form action={aprovarAfiliado}>
                      <input type="hidden" name="id" value={a.id} />
                      <button className="rotulo border border-positivo/50 px-4 py-2 text-xs text-positivo transition-colors hover:bg-positivo hover:text-base-bg">
                        {a.status === "pendente" ? "Aprovar" : "Reativar"}
                      </button>
                    </form>
                  )}

                  {r.pendente > 0 && a.chave_pix && (
                    <form action={marcarComissoesPagas}>
                      <input type="hidden" name="id" value={a.id} />
                      <button className="rotulo border border-ambar/50 px-4 py-2 text-xs text-ambar transition-colors hover:bg-ambar hover:text-base-bg">
                        Já fiz o Pix de {moeda(r.pendente)}
                      </button>
                    </form>
                  )}

                  {a.status === "ativo" && (
                    <form action={suspenderAfiliado}>
                      <input type="hidden" name="id" value={a.id} />
                      <button className="text-xs text-white/30 underline hover:text-negativo">
                        Suspender
                      </button>
                    </form>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
