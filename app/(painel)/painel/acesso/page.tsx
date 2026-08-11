import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FormVoucher, ListaPlanos } from "./cliente";

export const dynamic = "force-dynamic";

function formatarData(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default async function AcessoPage({
  searchParams,
}: {
  searchParams: { retorno?: string };
}) {
  const supabase = createClient();

  const { data: empresa } = await supabase
    .from("minha_empresa")
    .select("*")
    .maybeSingle();

  if (!empresa) redirect("/login");

  const { data: planos } = await supabase
    .from("planos")
    .select("id, nome, descricao, duracao_dias, preco")
    .eq("ativo", true)
    .gt("preco", 0)
    .order("ordem_exibicao");

  return (
    <div className="max-w-2xl">
      <h1 className="titulo text-3xl font-semibold">Seu acesso</h1>

      {searchParams.retorno && (
        <p className="mt-4 painel painel-destaque px-4 py-3 text-sm text-ambar-light">
          Recebemos seu pagamento. A confirmação pode levar alguns instantes —
          atualize esta página em um minuto se o acesso ainda não tiver sido
          liberado.
        </p>
      )}

      {/* Situação atual */}
      <div className="mt-6 painel p-6">
        {empresa.acesso_vitalicio ? (
          <>
            <p className="rotulo text-ambar">
              Acesso vitalício
            </p>
            <p className="mt-2 text-white/70">
              Seu acesso ao SIG não expira.
            </p>
          </>
        ) : empresa.tem_acesso ? (
          <>
            <p className="rotulo text-ambar">
              Acesso ativo
            </p>
            <p className="mt-2 text-white/70">
              Válido até {formatarData(empresa.acesso_expira_em)} —{" "}
              {empresa.dias_restantes}{" "}
              {empresa.dias_restantes === 1 ? "dia restante" : "dias restantes"}.
            </p>
            <p className="mt-3 text-sm text-white/40">
              Renovações são somadas ao prazo atual. Você não perde os dias que
              já pagou.
            </p>
          </>
        ) : (
          <>
            <p className="rotulo text-white/50">
              Acesso inativo
            </p>
            <p className="mt-2 text-white/70">
              Escolha um plano ou resgate um voucher para liberar os agentes.
            </p>
          </>
        )}
      </div>

      {/* Planos */}
      {!empresa.acesso_vitalicio && (
        <section className="mt-10">
          <h2 className="titulo text-xl">
            {empresa.tem_acesso ? "Estender acesso" : "Escolher um plano"}
          </h2>

          {planos && planos.length > 0 ? (
            <ListaPlanos planos={planos} />
          ) : (
            <p className="mt-4 painel px-4 py-3 text-sm text-white/50">
              Nenhum plano disponível no momento. Entre em contato para
              contratar.
            </p>
          )}
        </section>
      )}

      {/* Voucher */}
      <section className="mt-10">
        <h2 className="titulo text-xl">Tenho um voucher</h2>
        <p className="mt-1 text-sm text-white/50">
          Códigos de cortesia liberam ou estendem seu acesso imediatamente.
        </p>
        <FormVoucher />
      </section>
    </div>
  );
}
