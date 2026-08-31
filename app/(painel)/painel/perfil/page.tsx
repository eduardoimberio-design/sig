import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FormEmpresa, FormUsuario } from "./cliente";

export const dynamic = "force-dynamic";

export default async function PerfilPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: vinculo } = await supabase
    .from("usuarios_empresa")
    .select("empresa_id, nome")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!vinculo) redirect("/cadastro");

  const { data: empresa } = await supabase
    .from("empresas")
    .select(
      "nome, razao_social, cnpj, telefone, email_contato, endereco, cidade, uf, cep, tipo_negocio"
    )
    .eq("id", vinculo.empresa_id)
    .maybeSingle();

  const faltando: string[] = [];
  if (!empresa?.cnpj) faltando.push("CNPJ");
  if (!empresa?.telefone) faltando.push("telefone");
  if (!empresa?.cidade) faltando.push("cidade");

  return (
    <div className="space-y-8">
      <div>
        <p className="rotulo text-cyan">Cadastro</p>
        <h1 className="titulo mt-2 text-3xl">Meus dados</h1>
        <p className="mt-2 max-w-2xl text-sm text-white/50">
          Corrija aqui qualquer informação do cadastro. A alteração vale na
          hora, em todo o sistema.
        </p>
      </div>

      {faltando.length > 0 && (
        <div className="painel border-alerta/40 p-5">
          <p className="text-sm text-white/65">
            Faltam informações no seu cadastro:{" "}
            <span className="text-alerta">{faltando.join(", ")}</span>.
          </p>
        </div>
      )}

      <FormEmpresa empresa={empresa ?? {}} />
      <FormUsuario nome={vinculo.nome} />

      <div className="painel p-5">
        <p className="rotulo mb-2 text-white/45">Conta de acesso</p>
        <p className="text-sm text-white/60">{user.email}</p>
        <p className="mt-2 text-xs text-white/30">
          O e-mail de login não é alterado por aqui. Se precisar trocar, fale
          com o suporte.
        </p>
      </div>
    </div>
  );
}
