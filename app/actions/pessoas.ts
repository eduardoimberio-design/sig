"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

// formData.get() devolve null quando o campo não existe no formulário
// (ex.: checkbox desmarcado) — e z.string().optional() só aceita
// undefined. Este helper evita que isso derrube a validação inteira.
const textoOpcional = z
  .string()
  .nullish()
  .transform((v) => v ?? undefined);

export type EstadoForm = { erro?: string; sucesso?: string };

async function contexto() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, empresaId: null as string | null };

  const { data } = await supabase
    .from("usuarios_empresa")
    .select("empresa_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  return { supabase, empresaId: data?.empresa_id ?? null };
}

// ---------------------------------------------------------
// COLABORADORES
// ---------------------------------------------------------
const schemaColaborador = z.object({
  nome: z.string().trim().min(2, "Informe o nome."),
  funcao: z.string().trim().min(2, "Informe a função."),
  nivel_qualificacao: textoOpcional,
  turno: textoOpcional,
});

export async function salvarColaborador(
  _estado: EstadoForm,
  formData: FormData
): Promise<EstadoForm> {
  const parsed = schemaColaborador.safeParse({
    nome: formData.get("nome"),
    funcao: formData.get("funcao"),
    nivel_qualificacao: formData.get("nivel_qualificacao"),
    turno: formData.get("turno"),
  });

  if (!parsed.success) return { erro: parsed.error.issues[0].message };

  const { supabase, empresaId } = await contexto();
  if (!empresaId) return { erro: "Sessão expirada." };

  const { error } = await supabase.from("colaboradores").insert({
    empresa_id: empresaId,
    nome: parsed.data.nome,
    funcao: parsed.data.funcao,
    nivel_qualificacao: parsed.data.nivel_qualificacao || null,
    turno: parsed.data.turno || null,
  });

  if (error) return { erro: "Não foi possível salvar o colaborador." };

  revalidatePath("/painel/estoque/questionario");
  return { sucesso: "Colaborador adicionado." };
}

export async function removerColaborador(formData: FormData) {
  const id = String(formData.get("id"));
  const { supabase, empresaId } = await contexto();
  if (!empresaId) return;

  await supabase
    .from("colaboradores")
    .delete()
    .eq("id", id)
    .eq("empresa_id", empresaId);

  revalidatePath("/painel/estoque/questionario");
}

// ---------------------------------------------------------
// FORNECEDORES
// ---------------------------------------------------------
const schemaFornecedor = z.object({
  nome: z.string().trim().min(2, "Informe o nome do fornecedor."),
  categoria_fornecida: textoOpcional,
  dia_entrega: textoOpcional,
  frequencia: textoOpcional,
  contato: textoOpcional,
});

export async function salvarFornecedor(
  _estado: EstadoForm,
  formData: FormData
): Promise<EstadoForm> {
  const parsed = schemaFornecedor.safeParse({
    nome: formData.get("nome"),
    categoria_fornecida: formData.get("categoria_fornecida"),
    dia_entrega: formData.get("dia_entrega"),
    frequencia: formData.get("frequencia"),
    contato: formData.get("contato"),
  });

  if (!parsed.success) return { erro: parsed.error.issues[0].message };

  const { supabase, empresaId } = await contexto();
  if (!empresaId) return { erro: "Sessão expirada." };

  const diasArray = parsed.data.dia_entrega
    ? parsed.data.dia_entrega.split(",").filter(Boolean)
    : [];

  const { error } = await supabase.from("fornecedores").insert({
    empresa_id: empresaId,
    nome: parsed.data.nome,
    categoria_fornecida: parsed.data.categoria_fornecida || null,
    dia_entrega: diasArray,
    frequencia: parsed.data.frequencia || null,
    contato: parsed.data.contato || null,
  });

  if (error) return { erro: "Não foi possível salvar o fornecedor." };

  revalidatePath("/painel/estoque/questionario");
  return { sucesso: "Fornecedor adicionado." };
}

export async function removerFornecedor(formData: FormData) {
  const id = String(formData.get("id"));
  const { supabase, empresaId } = await contexto();
  if (!empresaId) return;

  await supabase
    .from("fornecedores")
    .delete()
    .eq("id", id)
    .eq("empresa_id", empresaId);

  revalidatePath("/painel/estoque/questionario");
}
