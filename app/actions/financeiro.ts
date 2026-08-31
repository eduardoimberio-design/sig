"use server";
import { lerDocumentoFaturamento } from "@/lib/documentos/leitor-faturamento";
import { registrarEvento } from "@/lib/eventos";

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

// =========================================================
// FATURAMENTO POR DOCUMENTO E CONSOLIDADO
// =========================================================

/**
 * Lê o relatório de vendas e devolve o que encontrou — sem gravar
 * nada. A gravação só acontece depois que o usuário confere na tela.
 * Leitura por visão erra; número de faturamento errado contamina
 * CMV, margem e todas as recomendações dos agentes.
 */
export async function lerFaturamentoDocumento(
  _estado: any,
  formData: FormData
): Promise<{ erro?: string; leitura?: any }> {
  const arquivo = formData.get("arquivo") as File | null;
  if (!arquivo || arquivo.size === 0) return { erro: "Selecione um arquivo." };

  if (arquivo.size > 15 * 1024 * 1024) {
    return { erro: "Arquivo maior que 15MB." };
  }

  const extensao = arquivo.name.split(".").pop()?.toLowerCase() ?? "";
  const tipos: Record<string, any> = {
    pdf: "application/pdf",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
  };
  const mediaType = tipos[extensao];
  if (!mediaType) {
    return { erro: "Envie PDF, JPG, PNG ou WEBP." };
  }

  const { empresaId } = await empresaDoUsuario();
  if (!empresaId) return { erro: "Sessão expirada. Entre novamente." };

  const bytes = Buffer.from(await arquivo.arrayBuffer());
  const descricao = formData.get("descricao");

  try {
    const leitura = await lerDocumentoFaturamento({
      base64: bytes.toString("base64"),
      mediaType,
      anoReferencia: new Date().getFullYear(),
      descricao: typeof descricao === "string" ? descricao : null,
    });

    return { leitura };
  } catch (e: any) {
    await registrarEvento({
      origem: "documentos",
      tipo: "leitura_falhou",
      mensagem: e?.message ?? "Falha ao ler relatório de vendas.",
      empresaId,
      detalhe: { extensao },
    });
    return { erro: e?.message ?? "Não consegui ler o documento." };
  }
}

const schemaFaturamentoConsolidado = z.object({
  inicio: z.string().min(10, "Informe o início do período."),
  fim: z.string().min(10, "Informe o fim do período."),
  valor: valorBR,
  num_atendimentos: z.coerce.number().int().min(0).optional(),
});

/**
 * Faturamento de um período inteiro numa linha só.
 *
 * Existe porque muitos sistemas de PDV do cliente só entregam o total
 * do mês. Antes disso, o cliente era obrigado a lançar o total do mês
 * como se fosse a venda de um único dia — o que distorce qualquer
 * análise por dia da semana.
 */
export async function salvarFaturamentoConsolidado(
  _estado: EstadoForm,
  formData: FormData
): Promise<EstadoForm> {
  const parsed = schemaFaturamentoConsolidado.safeParse({
    inicio: formData.get("inicio"),
    fim: formData.get("fim"),
    valor: formData.get("valor"),
    num_atendimentos: formData.get("num_atendimentos") || 0,
  });

  if (!parsed.success) return { erro: parsed.error.issues[0].message };
  if (parsed.data.fim < parsed.data.inicio) {
    return { erro: "O fim do período não pode ser antes do início." };
  }

  const { supabase, empresaId } = await empresaDoUsuario();
  if (!empresaId) return { erro: "Sessão expirada. Entre novamente." };

  const [ai, mi] = parsed.data.inicio.split("-");
  const [af, mf] = parsed.data.fim.split("-");
  const rotulo =
    ai === af && mi === mf
      ? `consolidado ${mi}/${ai}`
      : `consolidado ${mi}/${ai}-${mf}/${af}`;

  // Fica gravado na última data do período: assim entra em qualquer
  // consulta que cubra o intervalo, sem inventar venda em dia nenhum.
  const { error } = await supabase.from("vendas_diarias").upsert(
    {
      empresa_id: empresaId,
      data: parsed.data.fim,
      faturamento: parsed.data.valor,
      num_atendimentos: parsed.data.num_atendimentos ?? 0,
      canal: rotulo,
      observacoes: `Faturamento consolidado de ${parsed.data.inicio} a ${parsed.data.fim}.`,
    },
    { onConflict: "empresa_id,data,canal" }
  );

  if (error) return { erro: "Não consegui salvar o faturamento." };

  revalidatePath("/painel/financeiro");
  revalidatePath("/painel/financeiro/faturamento");
  revalidatePath("/painel");
  return {
    sucesso: `Faturamento de ${rotulo} registrado.`,
  };
}

/**
 * Grava o que o usuário confirmou depois da leitura do documento.
 * Recebe JSON porque a quantidade de linhas varia.
 */
export async function confirmarFaturamentoLido(
  _estado: EstadoForm,
  formData: FormData
): Promise<EstadoForm> {
  const bruto = formData.get("itens");
  if (typeof bruto !== "string") return { erro: "Nada para registrar." };

  let itens: any[];
  try {
    itens = JSON.parse(bruto);
  } catch {
    return { erro: "Dados inválidos." };
  }

  if (!Array.isArray(itens) || itens.length === 0) {
    return { erro: "Nenhuma linha para registrar." };
  }

  const { supabase, empresaId } = await empresaDoUsuario();
  if (!empresaId) return { erro: "Sessão expirada. Entre novamente." };

  const linhas = itens
    .filter(
      (i) =>
        typeof i?.data === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(i.data) &&
        Number.isFinite(Number(i?.valor))
    )
    .map((i) => ({
      empresa_id: empresaId,
      data: i.data,
      faturamento: Number(i.valor),
      num_atendimentos: Number.isFinite(Number(i.atendimentos))
        ? Number(i.atendimentos)
        : 0,
      canal: i.canal ? String(i.canal).slice(0, 40) : "importado",
      observacoes: "Importado de relatório de vendas, confirmado pelo usuário.",
    }));

  if (linhas.length === 0) return { erro: "Nenhuma linha válida." };

  const { error } = await supabase
    .from("vendas_diarias")
    .upsert(linhas, { onConflict: "empresa_id,data,canal" });

  if (error) return { erro: "Não consegui gravar os lançamentos." };

  revalidatePath("/painel/financeiro");
  revalidatePath("/painel/financeiro/faturamento");
  revalidatePath("/painel");
  return { sucesso: `${linhas.length} lançamento(s) registrado(s).` };
}
