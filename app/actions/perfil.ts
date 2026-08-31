"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type EstadoForm = { erro?: string; sucesso?: string };

/**
 * Valida CNPJ pelos dígitos verificadores. Formato certo com dígito
 * errado é o caso mais comum de digitação — e só aparece meses
 * depois, na hora de emitir uma nota.
 */
function cnpjValido(bruto: string): boolean {
  const n = bruto.replace(/\D/g, "");
  if (n.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(n)) return false;

  const calc = (fatiaAte: number) => {
    let peso = fatiaAte - 7;
    let soma = 0;
    for (let i = 0; i < fatiaAte; i++) {
      soma += Number(n[i]) * peso--;
      if (peso < 2) peso = 9;
    }
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };

  return calc(12) === Number(n[12]) && calc(13) === Number(n[13]);
}

const UFS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA",
  "PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

function opcional(valor: FormDataEntryValue | null): string | null {
  if (typeof valor !== "string") return null;
  const limpo = valor.trim();
  return limpo === "" ? null : limpo;
}

const schema = z.object({
  nome: z.string().trim().min(2, "Informe o nome do estabelecimento."),
  razao_social: z.string().trim().max(160).nullable(),
  cnpj: z.string().trim().nullable(),
  telefone: z.string().trim().max(30).nullable(),
  email_contato: z
    .string()
    .trim()
    .email("E-mail de contato inválido.")
    .nullable(),
  endereco: z.string().trim().max(200).nullable(),
  cidade: z.string().trim().max(80).nullable(),
  uf: z.string().trim().length(2, "UF deve ter 2 letras.").nullable(),
  cep: z.string().trim().max(12).nullable(),
  tipo_negocio: z.string().trim().max(60).nullable(),
});

export async function salvarDadosCadastrais(
  _estado: EstadoForm,
  formData: FormData
): Promise<EstadoForm> {
  const parsed = schema.safeParse({
    nome: formData.get("nome"),
    razao_social: opcional(formData.get("razao_social")),
    cnpj: opcional(formData.get("cnpj")),
    telefone: opcional(formData.get("telefone")),
    email_contato: opcional(formData.get("email_contato")),
    endereco: opcional(formData.get("endereco")),
    cidade: opcional(formData.get("cidade")),
    uf: opcional(formData.get("uf")),
    cep: opcional(formData.get("cep")),
    tipo_negocio: opcional(formData.get("tipo_negocio")),
  });

  if (!parsed.success) return { erro: parsed.error.issues[0].message };

  const dados = parsed.data;

  if (dados.cnpj && !cnpjValido(dados.cnpj)) {
    return { erro: "CNPJ inválido. Confira os números." };
  }

  if (dados.uf && !UFS.includes(dados.uf.toUpperCase())) {
    return { erro: "UF inválida." };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { erro: "Sessão expirada. Entre novamente." };

  const { data: vinculo } = await supabase
    .from("usuarios_empresa")
    .select("empresa_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!vinculo) return { erro: "Empresa não encontrada." };

  const { error } = await supabase
    .from("empresas")
    .update({
      nome: dados.nome,
      razao_social: dados.razao_social,
      cnpj: dados.cnpj ? dados.cnpj.replace(/\D/g, "") : null,
      telefone: dados.telefone,
      email_contato: dados.email_contato,
      endereco: dados.endereco,
      cidade: dados.cidade,
      uf: dados.uf ? dados.uf.toUpperCase() : null,
      cep: dados.cep,
      tipo_negocio: dados.tipo_negocio,
    })
    .eq("id", vinculo.empresa_id);

  if (error) {
    // CNPJ é único: outra empresa pode já ter usado o mesmo número.
    if (String(error.message).includes("duplicate")) {
      return { erro: "Este CNPJ já está cadastrado em outra conta." };
    }
    return { erro: "Não consegui salvar os dados." };
  }

  revalidatePath("/painel/perfil");
  revalidatePath("/painel", "layout");
  return { sucesso: "Dados atualizados." };
}

const schemaUsuario = z.object({
  nome: z.string().trim().min(2, "Informe seu nome."),
});

export async function salvarMeuNome(
  _estado: EstadoForm,
  formData: FormData
): Promise<EstadoForm> {
  const parsed = schemaUsuario.safeParse({ nome: formData.get("nome") });
  if (!parsed.success) return { erro: parsed.error.issues[0].message };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { erro: "Sessão expirada. Entre novamente." };

  const { error } = await supabase
    .from("usuarios_empresa")
    .update({ nome: parsed.data.nome })
    .eq("auth_user_id", user.id);

  if (error) return { erro: "Não consegui salvar seu nome." };

  revalidatePath("/painel/perfil");
  revalidatePath("/painel", "layout");
  return { sucesso: "Nome atualizado." };
}
