import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CardAnexos } from "@/components/anexos";
import { GradeEscala, PainelAusencias, PainelTreinamentos } from "./cliente";

export const dynamic = "force-dynamic";

export default async function EquipePage() {
  const supabase = createClient();

  const { data: empresa } = await supabase
    .from("minha_empresa")
    .select("id, tem_acesso")
    .maybeSingle();

  if (!empresa) redirect("/login");
  if (!empresa.tem_acesso) redirect("/painel/acesso");

  const { data: anexos } = await supabase
    .from("anexos_contexto")
    .select("id, nome_arquivo, tipo_arquivo, descricao, resumo_ia, status, created_at")
    .eq("modulo", "equipe")
    .neq("status", "descartado")
    .order("created_at", { ascending: false });

  const [
    { data: colaboradores },
    { data: escala },
    { data: ausencias },
    { data: treinamentos },
    { data: participantesPorTreino },
  ] = await Promise.all([
    supabase
      .from("colaboradores")
      .select("*")
      .eq("ativo", true)
      .order("nome"),
    supabase.from("escala_trabalho").select("*"),
    supabase
      .from("ausencias")
      .select("*, colaboradores(nome)")
      // Inclui os últimos 30 dias: registrar uma falta de ontem é
      // caso de uso comum, e some da tela se filtrarmos só o futuro.
      .gte(
        "data",
        new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
      )
      .order("data", { ascending: false })
      .limit(30),
    supabase
      .from("treinamentos")
      .select("*")
      .order("data_realizacao", { ascending: false })
      .limit(20),
    supabase
      .from("treinamento_participantes")
      .select("treinamento_id, colaboradores(nome)"),
  ]);

  if (!colaboradores || colaboradores.length === 0) {
    return (
      <div className="max-w-lg">
        <header className="mb-6">
          <span className="rotulo text-cyan">Equipe</span>
          <h1 className="titulo mt-1 text-3xl font-semibold">
            Escala e treinamentos
          </h1>
        </header>
        <div className="painel p-8 text-center">
          <p className="titulo text-lg text-ambar">
            Nenhum colaborador cadastrado
          </p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-white/50">
            Cadastre sua equipe no questionário operacional do Agente de
            Estoque antes de montar a escala.
          </p>
          <a
            href="/painel/estoque/questionario"
            className="rotulo mt-5 inline-block border border-cyan bg-cyan/10 px-5 py-2.5 text-cyan hover:bg-cyan hover:text-base-bg"
          >
            Ir para o cadastro de colaboradores
          </a>
        </div>
      </div>
    );
  }

  // Agrupa participantes por treinamento para exibição
  const participantesMap = new Map<string, string[]>();
  for (const p of participantesPorTreino ?? []) {
    const lista = participantesMap.get(p.treinamento_id) ?? [];
    lista.push((p.colaboradores as any)?.nome ?? "—");
    participantesMap.set(p.treinamento_id, lista);
  }

  return (
    <div className="space-y-10">
      <header>
        <span className="rotulo text-cyan">Equipe</span>
        <h1 className="titulo mt-1 text-3xl font-semibold">
          Escala e treinamentos
        </h1>
      </header>

      <section>
        <h2 className="titulo mb-4 text-xl">Escala semanal</h2>
        <GradeEscala colaboradores={colaboradores} escala={escala ?? []} />
      </section>

      <section>
        <h2 className="titulo mb-4 text-xl">Ausências</h2>
        <PainelAusencias colaboradores={colaboradores} ausencias={ausencias ?? []} />
      </section>

      <section>
        <h2 className="titulo mb-4 text-xl">Treinamentos</h2>
        <PainelTreinamentos
          colaboradores={colaboradores}
          treinamentos={treinamentos ?? []}
          participantesMap={Object.fromEntries(participantesMap)}
        />
      </section>

      <CardAnexos modulo="equipe" anexos={(anexos ?? []) as any} />
    </div>
  );
}
