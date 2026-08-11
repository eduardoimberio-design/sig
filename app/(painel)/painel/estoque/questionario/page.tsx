import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FormQuestionario } from "./cliente";

export const dynamic = "force-dynamic";

export default async function QuestionarioPage() {
  const supabase = createClient();

  const { data: empresa } = await supabase
    .from("minha_empresa")
    .select("id, tem_acesso")
    .maybeSingle();

  if (!empresa) redirect("/login");
  if (!empresa.tem_acesso) redirect("/painel/acesso");

  const { data: questionario } = await supabase
    .from("questionario_operacional")
    .select("*")
    .maybeSingle();

  const [{ data: colaboradores }, { data: fornecedores }] = await Promise.all([
    supabase
      .from("colaboradores")
      .select("*")
      .eq("ativo", true)
      .order("created_at"),
    supabase.from("fornecedores").select("*").order("created_at"),
  ]);

  return (
    <div className="max-w-3xl space-y-8">
      <header>
        <span className="rotulo text-cyan">Agente de Estoque</span>
        <h1 className="titulo mt-1 text-3xl font-semibold">
          Questionário operacional
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-white/50">
          Quanto mais completo, mais preciso fica o Consultor IA e o futuro
          agente de workflow de produção. Nada aqui é obrigatório — preencha
          o que fizer sentido agora e volte depois.
        </p>
        {questionario?.ultima_revisao && (
          <p className="mt-2 text-xs text-white/35">
            Última revisão:{" "}
            {new Date(questionario.ultima_revisao).toLocaleDateString("pt-BR")}
          </p>
        )}
      </header>

      <FormQuestionario
        dados={questionario}
        colaboradores={colaboradores ?? []}
        fornecedores={fornecedores ?? []}
      />
    </div>
  );
}
