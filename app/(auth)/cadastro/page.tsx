import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FormCadastroNovo } from "./formulario";
import { FormCompletarCadastro } from "@/components/completar-cadastro";

export const dynamic = "force-dynamic";

/**
 * Esta tela atende dois casos bem diferentes, e misturá-los foi o que
 * causou confusão antes:
 *
 * 1. Visitante sem conta → formulário completo de criação.
 * 2. Alguém já logado, mas sem estabelecimento vinculado → só falta o
 *    nome do negócio. Pedir e-mail e senha de novo aqui fazia a pessoa
 *    achar que estava criando outra conta, quando na verdade o sistema
 *    usava a sessão ativa.
 */
export default async function CadastroPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return <FormCadastroNovo />;

  const { data: vinculo } = await supabase
    .from("usuarios_empresa")
    .select("empresa_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  // Já tem tudo: não há o que cadastrar.
  if (vinculo) redirect("/painel");

  return <FormCompletarCadastro email={user.email ?? ""} />;
}
