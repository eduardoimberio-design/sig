"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type EstadoForm = { erro?: string; sucesso?: string };

async function empresaDoUsuario() {
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

// formData.get() devolve null quando o campo não existe no formulário
// (ex.: checkbox desmarcado) — e z.string().optional() só aceita
// undefined. Este helper evita que isso derrube a validação inteira.
const textoOpcional = z
  .string()
  .nullish()
  .transform((v) => v ?? undefined);

const valorBR = z
  .string()
  .trim()
  .min(1, "Informe o valor.")
  .transform((v) => Number(v.replace(/\./g, "").replace(",", ".")))
  .refine((n) => !isNaN(n) && n > 0, "Valor inválido.");

const schemaConta = z.object({
  descricao: z.string().trim().min(2, "Descreva a conta."),
  valor: valorBR,
  vencimento: z.string().min(10, "Informe o vencimento."),
  grupo_dre: textoOpcional,
  categoria: z.string().trim().optional(),
  contraparte: z.string().trim().optional(),
});

export async function salvarContaPagar(
  _estado: EstadoForm,
  formData: FormData
): Promise<EstadoForm> {
  const parsed = schemaConta.safeParse({
    descricao: formData.get("descricao"),
    valor: formData.get("valor"),
    vencimento: formData.get("vencimento"),
    grupo_dre: formData.get("grupo_dre"),
    contraparte: formData.get("contraparte"),
  });

  if (!parsed.success) return { erro: parsed.error.issues[0].message };

  const { supabase, empresaId } = await empresaDoUsuario();
  if (!empresaId) return { erro: "Sessão expirada. Entre novamente." };

  const { error } = await supabase.from("contas_pagar").insert({
    empresa_id: empresaId,
    descricao: parsed.data.descricao,
    valor: parsed.data.valor,
    vencimento: parsed.data.vencimento,
    grupo_dre: parsed.data.grupo_dre || "despesa_variavel",
    fornecedor: parsed.data.contraparte || null,
    status: "pendente",
  });

  if (error) return { erro: "Não foi possível salvar a conta." };

  revalidatePath("/painel/financeiro");
  return { sucesso: "Conta a pagar registrada." };
}

export async function salvarContaReceber(
  _estado: EstadoForm,
  formData: FormData
): Promise<EstadoForm> {
  const parsed = schemaConta.safeParse({
    descricao: formData.get("descricao"),
    valor: formData.get("valor"),
    vencimento: formData.get("vencimento"),
    contraparte: formData.get("contraparte"),
  });

  if (!parsed.success) return { erro: parsed.error.issues[0].message };

  const { supabase, empresaId } = await empresaDoUsuario();
  if (!empresaId) return { erro: "Sessão expirada. Entre novamente." };

  const { error } = await supabase.from("contas_receber").insert({
    empresa_id: empresaId,
    descricao: parsed.data.descricao,
    valor: parsed.data.valor,
    vencimento: parsed.data.vencimento,
    cliente: parsed.data.contraparte || null,
    status: "pendente",
  });

  if (error) return { erro: "Não foi possível salvar a conta." };

  revalidatePath("/painel/financeiro");
  return { sucesso: "Conta a receber registrada." };
}

const schemaVenda = z.object({
  data: z.string().min(10, "Informe a data."),
  faturamento: valorBR,
  num_atendimentos: z
    .string()
    .trim()
    .transform((v) => (v === "" ? 0 : Number(v)))
    .refine((n) => !isNaN(n) && n >= 0, "Número de atendimentos inválido."),
  canal: z.string().trim().optional(),
});

export async function salvarVenda(
  _estado: EstadoForm,
  formData: FormData
): Promise<EstadoForm> {
  const parsed = schemaVenda.safeParse({
    data: formData.get("data"),
    faturamento: formData.get("faturamento"),
    num_atendimentos: formData.get("num_atendimentos"),
    canal: formData.get("canal"),
  });

  if (!parsed.success) return { erro: parsed.error.issues[0].message };

  const { supabase, empresaId } = await empresaDoUsuario();
  if (!empresaId) return { erro: "Sessão expirada. Entre novamente." };

  // upsert: relançar o mesmo dia corrige em vez de duplicar
  const { error } = await supabase.from("vendas_diarias").upsert(
    {
      empresa_id: empresaId,
      data: parsed.data.data,
      faturamento: parsed.data.faturamento,
      num_atendimentos: parsed.data.num_atendimentos,
      canal: parsed.data.canal || null,
    },
    { onConflict: "empresa_id,data,canal" }
  );

  if (error) return { erro: "Não foi possível salvar o faturamento." };

  revalidatePath("/painel/financeiro");
  return { sucesso: "Faturamento registrado." };
}

export async function marcarPago(formData: FormData) {
  const id = String(formData.get("id"));
  const tabela = String(formData.get("tabela"));

  if (!["contas_pagar", "contas_receber"].includes(tabela)) return;

  const { supabase, empresaId } = await empresaDoUsuario();
  if (!empresaId) return;

  const campoData =
    tabela === "contas_pagar" ? "data_pagamento" : "data_recebimento";

  await supabase
    .from(tabela)
    .update({ status: "pago", [campoData]: new Date().toISOString() })
    .eq("id", id)
    .eq("empresa_id", empresaId); // trava extra além do RLS

  revalidatePath("/painel/financeiro");
}

// =========================================================
// EDIÇÃO E EXCLUSÃO DE LANÇAMENTOS
//
// Sem isto, um valor digitado errado ficava para sempre — e
// contaminava DRE, CMV e o painel de desempenho em silêncio.
// =========================================================

const schemaEdicaoConta = z.object({
  id: z.string().uuid(),
  descricao: z.string().trim().min(2, "Descreva a conta."),
  valor: valorBR,
  vencimento: z.string().min(10, "Informe o vencimento."),
  grupo_dre: textoOpcional,
  contraparte: z.string().trim().optional(),
});

export async function editarConta(
  _estado: EstadoForm,
  formData: FormData
): Promise<EstadoForm> {
  const tipo = formData.get("tipo");
  if (tipo !== "pagar" && tipo !== "receber") {
    return { erro: "Tipo de lançamento inválido." };
  }

  const parsed = schemaEdicaoConta.safeParse({
    id: formData.get("id"),
    descricao: formData.get("descricao"),
    valor: formData.get("valor"),
    vencimento: formData.get("vencimento"),
    grupo_dre: formData.get("grupo_dre"),
    contraparte: formData.get("contraparte"),
  });

  if (!parsed.success) return { erro: parsed.error.issues[0].message };

  const { supabase, empresaId } = await empresaDoUsuario();
  if (!empresaId) return { erro: "Sessão expirada. Entre novamente." };

  const tabela = tipo === "pagar" ? "contas_pagar" : "contas_receber";

  // O grupo do DRE só existe em conta a pagar: é ele que separa
  // mercadoria de folha e de despesa fixa no cálculo.
  const dados: Record<string, unknown> = {
    descricao: parsed.data.descricao,
    valor: parsed.data.valor,
    vencimento: parsed.data.vencimento,
  };

  if (tipo === "pagar") {
    dados.fornecedor = parsed.data.contraparte || null;
    if (parsed.data.grupo_dre) dados.grupo_dre = parsed.data.grupo_dre;
  } else {
    dados.cliente = parsed.data.contraparte || null;
  }

  const { error } = await supabase
    .from(tabela)
    .update(dados)
    .eq("id", parsed.data.id)
    .eq("empresa_id", empresaId);

  if (error) return { erro: "Não consegui salvar a alteração." };

  revalidatePath("/painel/financeiro/lancamentos");
  revalidatePath("/painel/financeiro");
  revalidatePath("/painel");
  return { sucesso: "Lançamento corrigido." };
}

const schemaEdicaoVenda = z.object({
  id: z.string().uuid(),
  data: z.string().min(10, "Informe a data."),
  faturamento: valorBR,
  num_atendimentos: z.coerce.number().int().min(0).optional(),
  canal: z.string().trim().optional(),
});

export async function editarVenda(
  _estado: EstadoForm,
  formData: FormData
): Promise<EstadoForm> {
  const parsed = schemaEdicaoVenda.safeParse({
    id: formData.get("id"),
    data: formData.get("data"),
    faturamento: formData.get("faturamento"),
    num_atendimentos: formData.get("num_atendimentos") || 0,
    canal: formData.get("canal"),
  });

  if (!parsed.success) return { erro: parsed.error.issues[0].message };

  const { supabase, empresaId } = await empresaDoUsuario();
  if (!empresaId) return { erro: "Sessão expirada. Entre novamente." };

  const { error } = await supabase
    .from("vendas_diarias")
    .update({
      data: parsed.data.data,
      faturamento: parsed.data.faturamento,
      num_atendimentos: parsed.data.num_atendimentos ?? 0,
      canal: parsed.data.canal || null,
    })
    .eq("id", parsed.data.id)
    .eq("empresa_id", empresaId);

  if (error) {
    // A tabela tem trava de data+canal repetidos por empresa.
    return {
      erro: "Não consegui salvar. Já existe lançamento para essa data e canal.",
    };
  }

  revalidatePath("/painel/financeiro/lancamentos");
  revalidatePath("/painel/financeiro");
  revalidatePath("/painel");
  return { sucesso: "Faturamento corrigido." };
}

export async function excluirLancamento(
  _estado: EstadoForm,
  formData: FormData
): Promise<EstadoForm> {
  const tipo = formData.get("tipo");
  const id = formData.get("id");

  if (typeof id !== "string") return { erro: "Lançamento não identificado." };

  const tabelas: Record<string, string> = {
    pagar: "contas_pagar",
    receber: "contas_receber",
    venda: "vendas_diarias",
  };

  const tabela = tabelas[String(tipo)];
  if (!tabela) return { erro: "Tipo de lançamento inválido." };

  const { supabase, empresaId } = await empresaDoUsuario();
  if (!empresaId) return { erro: "Sessão expirada. Entre novamente." };

  const { error } = await supabase
    .from(tabela)
    .delete()
    .eq("id", id)
    .eq("empresa_id", empresaId);

  if (error) return { erro: "Não consegui excluir." };

  revalidatePath("/painel/financeiro/lancamentos");
  revalidatePath("/painel/financeiro");
  revalidatePath("/painel");
  return { sucesso: "Lançamento excluído." };
}
