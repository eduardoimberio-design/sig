import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { BotaoGerarAgora, MarcarResumoLido } from "./cliente";

export const dynamic = "force-dynamic";

const NOME_ORIGEM: Record<string, string> = {
  joao: "João",
  anexos: "Envio de documentos",
  consultor: "Consultor IA",
  conselheiro: "Conselheiro",
  marketing: "Marketing",
  documentos: "Leitura de notas",
  pagamento: "Cobrança",
  suporte: "Suporte",
};

function quando(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Traduz erros técnicos conhecidos para linguagem de decisão.
 *
 * O texto cru da API em inglês, com código de requisição, não diz o que
 * fazer. Quando a mensagem é reconhecida, mostramos o problema e a ação;
 * o original continua acessível abaixo, para quando for preciso.
 */
function traduzir(mensagem: string): { titulo: string; acao: string } | null {
  const m = mensagem.toLowerCase();

  if (m.includes("credit balance is too low")) {
    return {
      titulo: "Crédito da Anthropic esgotado.",
      acao: "Todos os agentes de IA param enquanto isso. Recarregue em console.anthropic.com, em Plans & Billing, e considere ativar recarga automática.",
    };
  }

  if (m.includes("schema cache")) {
    return {
      titulo: "O banco não reconhece uma coluna que o sistema usa.",
      acao: "Falta rodar uma migration, ou o cache do Supabase está desatualizado. Rode: notify pgrst, 'reload schema';",
    };
  }

  if (m.includes("violates not-null constraint")) {
    return {
      titulo: "Um campo obrigatório chegou vazio e o registro foi recusado.",
      acao: "O dado se perdeu. Verifique qual campo o banco exige e se o formulário realmente o preenche.",
    };
  }

  if (m.includes("violates check constraint")) {
    return {
      titulo: "Um valor fora da lista permitida foi recusado.",
      acao: "Normalmente a IA extraiu algo que o banco não aceita. Compare a lista do banco com o que o extrator devolve.",
    };
  }

  if (m.includes("rate limit") || m.includes("429")) {
    return {
      titulo: "Limite de chamadas da IA atingido.",
      acao: "Costuma normalizar sozinho. Se repetir com frequência, vale revisar o limite da conta.",
    };
  }

  if (m.includes("duplicate key")) {
    return {
      titulo: "Tentativa de gravar algo que já existe.",
      acao: "Em geral é proteção funcionando, não falha. Confira se o cliente não lançou duas vezes.",
    };
  }

  return null;
}

function corSeveridade(s: string) {
  if (s === "critico") return "text-negativo border-negativo";
  if (s === "erro") return "text-alerta border-alerta";
  return "text-white/40 border-base-border";
}

export default async function SentinelaPage() {
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

  const [{ data: resumos }, { data: eventos }] = await Promise.all([
    supabase
      .from("resumos_sentinela")
      .select("*")
      .order("referencia", { ascending: false })
      .limit(14),
    supabase
      .from("eventos_sistema")
      .select("id, origem, tipo, severidade, mensagem, created_at")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const relatorios = resumos ?? [];
  const ultimo = relatorios[0];

  return (
    <main className="mx-auto max-w-4xl space-y-8 px-6 py-10">
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <Link href="/admin" className="rotulo text-white/40 hover:text-cyan">
            ← Admin
          </Link>
          <h1 className="titulo mt-2 text-3xl">Sentinela</h1>
          <p className="mt-2 max-w-2xl text-sm text-white/50">
            Vigia as falhas do sistema e entrega um relatório toda manhã. Os
            números são contados no banco — a análise só interpreta o que
            aconteceu de fato.
          </p>
        </div>
        <BotaoGerarAgora />
      </div>

      {ultimo ? (
        <section className="painel p-6">
          <div className="mb-4 flex items-baseline justify-between gap-4">
            <p className="rotulo text-cyan">
              Relatório de{" "}
              {new Date(ultimo.referencia + "T12:00:00").toLocaleDateString(
                "pt-BR"
              )}
            </p>
            <div className="flex items-baseline gap-3">
              {ultimo.total_criticos > 0 && (
                <span className="rotulo border border-negativo px-2 py-0.5 text-xs text-negativo">
                  {ultimo.total_criticos} crítica(s)
                </span>
              )}
              <span className="text-xs text-white/35">
                {ultimo.total_eventos} ocorrência(s)
              </span>
            </div>
          </div>

          <p className="whitespace-pre-line text-sm leading-relaxed text-white/75">
            {ultimo.resumo}
          </p>

          {!ultimo.lido && <MarcarResumoLido id={ultimo.id} />}
        </section>
      ) : (
        <section className="painel p-6">
          <p className="text-sm text-white/45">
            Nenhum relatório ainda. O primeiro sai amanhã de manhã, ou use
            &quot;Gerar agora&quot; para adiantar.
          </p>
        </section>
      )}

      {relatorios.length > 1 && (
        <section>
          <p className="rotulo mb-4 text-white/45">Relatórios anteriores</p>
          <div className="space-y-3">
            {relatorios.slice(1).map((r: any) => (
              <div key={r.id} className="painel p-5">
                <div className="mb-2 flex items-baseline justify-between gap-4">
                  <span className="rotulo text-white/45">
                    {new Date(r.referencia + "T12:00:00").toLocaleDateString(
                      "pt-BR"
                    )}
                  </span>
                  <span className="text-xs text-white/30">
                    {r.total_eventos} ocorrência(s)
                  </span>
                </div>
                <p className="whitespace-pre-line text-sm text-white/55">
                  {r.resumo}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <p className="rotulo mb-4 text-white/45">Últimas ocorrências</p>
        {(eventos ?? []).length === 0 ? (
          <div className="painel p-5">
            <p className="text-sm text-white/45">
              Nenhuma falha registrada até agora.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {(eventos ?? []).map((e: any) => (
              <div
                key={e.id}
                className="flex items-start gap-4 border border-base-border p-4"
              >
                <span
                  className={`rotulo shrink-0 border px-2 py-0.5 text-xs ${corSeveridade(e.severidade)}`}
                >
                  {e.severidade}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-white/70">
                    {NOME_ORIGEM[e.origem] ?? e.origem}
                    <span className="text-white/30"> · {e.tipo}</span>
                  </p>
                  {(() => {
                    const t = traduzir(e.mensagem);
                    if (!t) {
                      return (
                        <p className="mt-1 break-words text-sm text-white/45">
                          {e.mensagem}
                        </p>
                      );
                    }
                    return (
                      <>
                        <p className="mt-1 text-sm text-white/70">{t.titulo}</p>
                        <p className="mt-1 text-sm text-cyan/70">{t.acao}</p>
                        <details className="mt-2">
                          <summary className="cursor-pointer text-xs text-white/25 hover:text-white/50">
                            mensagem original
                          </summary>
                          <p className="mt-1 break-all text-xs text-white/30">
                            {e.mensagem}
                          </p>
                        </details>
                      </>
                    );
                  })()}
                </div>
                <span className="shrink-0 text-xs text-white/25">
                  {quando(e.created_at)}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
