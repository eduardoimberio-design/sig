import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { sair } from "@/app/actions/auth";
import { moeda } from "@/lib/formatters";
import { CopiarLink, FormDadosAfiliado } from "./cliente";

export const dynamic = "force-dynamic";

function data(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR");
}

export default async function PainelAfiliadoPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: afiliado } = await supabase
    .from("afiliados")
    .select("*")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!afiliado) redirect("/afiliados");

  const [{ data: indicacoes }, { data: comissoes }] = await Promise.all([
    supabase.rpc("afiliado_minhas_indicacoes"),
    supabase
      .from("comissoes")
      .select("valor_comissao, status, primeira_compra, created_at, pago_em")
      .order("created_at", { ascending: false }),
  ]);

  const lista = comissoes ?? [];
  const aReceber = lista
    .filter((c: any) => c.status === "pendente")
    .reduce((s: number, c: any) => s + Number(c.valor_comissao), 0);
  const recebido = lista
    .filter((c: any) => c.status === "paga")
    .reduce((s: number, c: any) => s + Number(c.valor_comissao), 0);

  const clientes = indicacoes ?? [];
  const ativos = clientes.filter((c: any) => c.ativo).length;

  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.sig-fsi.com.br";
  const link = afiliado.codigo ? `${base}/?ref=${afiliado.codigo}` : null;

  return (
    <div className="min-h-screen">
      <header className="border-b border-base-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-baseline gap-3">
            <span className="titulo text-xl font-semibold text-ambar">SIG</span>
            <span className="rotulo text-cyan">Afiliado</span>
          </div>
          <form action={sair}>
            <button className="text-sm text-white/40 hover:text-white/70">
              Sair
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-8 px-6 py-10">
        <div>
          <h1 className="titulo text-3xl">Olá, {afiliado.nome.split(" ")[0]}</h1>
        </div>

        {afiliado.status === "pendente" && (
          <div className="painel border-alerta/40 p-6">
            <p className="rotulo text-alerta">Cadastro em análise</p>
            <p className="mt-2 text-sm text-white/65">
              Seu cadastro foi recebido e está aguardando aprovação do SIG.
              Assim que for aprovado, seu link e seu código aparecem aqui.
              Enquanto isso, complete seus dados de repasse abaixo.
            </p>
          </div>
        )}

        {afiliado.status === "suspenso" && (
          <div className="painel border-negativo/40 p-6">
            <p className="rotulo text-negativo">Cadastro suspenso</p>
            <p className="mt-2 text-sm text-white/65">
              Novas comissões estão pausadas. Se tiver dúvida, fale com o SIG.
            </p>
          </div>
        )}

        {afiliado.status === "ativo" && link && (
          <div className="painel p-6">
            <p className="rotulo text-cyan">Seu link de indicação</p>
            <CopiarLink link={link} codigo={afiliado.codigo} />
            <p className="mt-3 text-xs text-white/35">
              Quem chegar pelo link fica ligado a você por 60 dias, mesmo que
              demore para se cadastrar. Se preferir, a pessoa pode digitar seu
              código no cadastro.
            </p>
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-3">
          <div className="painel p-5">
            <p className="rotulo text-white/45">A receber</p>
            <p className="cifra mt-2 text-3xl text-ambar">{moeda(aReceber)}</p>
            <p className="mt-1 text-xs text-white/30">repasse no próximo ciclo</p>
          </div>
          <div className="painel p-5">
            <p className="rotulo text-white/45">Já recebido</p>
            <p className="cifra mt-2 text-3xl text-positivo">{moeda(recebido)}</p>
          </div>
          <div className="painel p-5">
            <p className="rotulo text-white/45">Clientes indicados</p>
            <p className="cifra mt-2 text-3xl text-white/80">{clientes.length}</p>
            <p className="mt-1 text-xs text-white/30">{ativos} com acesso ativo</p>
          </div>
        </section>

        <section>
          <h2 className="titulo mb-4 text-xl">Suas indicações</h2>
          {clientes.length === 0 ? (
            <div className="painel p-5">
              <p className="text-sm text-white/45">
                Nenhuma indicação ainda.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {clientes.map((c: any, i: number) => (
                <div
                  key={i}
                  className="painel flex items-baseline justify-between gap-4 p-4"
                >
                  <div>
                    <p className="text-sm text-white/80">{c.estabelecimento}</p>
                    <p className="mt-0.5 text-xs text-white/35">
                      indicado em {data(c.indicado_em)} ·{" "}
                      <span className={c.ativo ? "text-positivo" : "text-white/40"}>
                        {c.ativo ? "ativo" : "sem acesso"}
                      </span>
                    </p>
                  </div>
                  <span className="cifra text-ambar">
                    {moeda(Number(c.total_comissao))}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        <FormDadosAfiliado afiliado={afiliado} />

        <p className="text-xs text-white/30">
          Dúvidas sobre o programa?{" "}
          <Link href="/afiliados" className="text-cyan/70 hover:underline">
            Veja as regras
          </Link>
          .
        </p>
      </main>
    </div>
  );
}
