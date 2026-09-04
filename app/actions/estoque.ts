"use server";

import { registrarEvento } from "@/lib/eventos";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { lerXmlNfe } from "@/lib/documentos/xml-nfe";
import { lerDocumentoComIA } from "@/lib/documentos/leitor-ia";

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

const valorBR = z
  .string()
  .trim()
  .transform((v) => Number(v.replace(/\./g, "").replace(",", ".")))
  .refine((n) => !isNaN(n) && n >= 0, "Valor inválido.");

// ---------------------------------------------------------
// INSUMOS
// ---------------------------------------------------------
const schemaInsumo = z.object({
  nome: z.string().trim().min(2, "Informe o nome do insumo."),
  unidade_medida: z.string().trim().min(1, "Informe a unidade."),
  custo_unitario: valorBR,
  estoque_atual: valorBR.optional(),
  estoque_minimo: valorBR.optional(),
  fornecedor_principal: z.string().trim().optional(),
});

export async function salvarInsumo(
  _estado: EstadoForm,
  formData: FormData
): Promise<EstadoForm> {
  const parsed = schemaInsumo.safeParse({
    nome: formData.get("nome"),
    unidade_medida: formData.get("unidade_medida"),
    custo_unitario: formData.get("custo_unitario"),
    estoque_atual: formData.get("estoque_atual") || "0",
    estoque_minimo: formData.get("estoque_minimo") || "0",
    fornecedor_principal: formData.get("fornecedor_principal"),
  });

  if (!parsed.success) return { erro: parsed.error.issues[0].message };

  const { supabase, empresaId } = await contexto();
  if (!empresaId) return { erro: "Sessão expirada." };

  const { error } = await supabase.from("insumos").insert({
    empresa_id: empresaId,
    nome: parsed.data.nome,
    unidade_medida: parsed.data.unidade_medida,
    custo_unitario: parsed.data.custo_unitario,
    estoque_atual: parsed.data.estoque_atual ?? 0,
    estoque_minimo: parsed.data.estoque_minimo ?? 0,
    fornecedor_principal: parsed.data.fornecedor_principal || null,
  });

  if (error) return { erro: "Não foi possível salvar o insumo." };

  revalidatePath("/painel/estoque");
  return { sucesso: "Insumo cadastrado." };
}

// ---------------------------------------------------------
// PRODUTOS + FICHA TÉCNICA
// ---------------------------------------------------------
const schemaProduto = z.object({
  nome: z.string().trim().min(2, "Informe o nome do produto."),
  categoria: z.string().trim().optional(),
  preco_venda: valorBR,
});

export async function salvarProduto(
  _estado: EstadoForm,
  formData: FormData
): Promise<EstadoForm> {
  const parsed = schemaProduto.safeParse({
    nome: formData.get("nome"),
    categoria: formData.get("categoria"),
    preco_venda: formData.get("preco_venda"),
  });

  if (!parsed.success) return { erro: parsed.error.issues[0].message };

  const { supabase, empresaId } = await contexto();
  if (!empresaId) return { erro: "Sessão expirada." };

  const { error } = await supabase.from("produtos").insert({
    empresa_id: empresaId,
    nome: parsed.data.nome,
    categoria: parsed.data.categoria || null,
    preco_venda: parsed.data.preco_venda,
  });

  if (error) return { erro: "Não foi possível salvar o produto." };

  revalidatePath("/painel/estoque");
  return { sucesso: "Produto cadastrado." };
}

const schemaItemFicha = z.object({
  produto_id: z.string().uuid(),
  insumo_id: z.string().uuid("Selecione um insumo."),
  quantidade: valorBR,
});

export async function adicionarItemFicha(
  _estado: EstadoForm,
  formData: FormData
): Promise<EstadoForm> {
  const parsed = schemaItemFicha.safeParse({
    produto_id: formData.get("produto_id"),
    insumo_id: formData.get("insumo_id"),
    quantidade: formData.get("quantidade"),
  });

  if (!parsed.success) return { erro: parsed.error.issues[0].message };

  const { supabase, empresaId } = await contexto();
  if (!empresaId) return { erro: "Sessão expirada." };

  const { error } = await supabase.from("ficha_tecnica_itens").insert({
    empresa_id: empresaId,
    produto_id: parsed.data.produto_id,
    insumo_id: parsed.data.insumo_id,
    quantidade: parsed.data.quantidade,
  });

  if (error) return { erro: "Não foi possível adicionar o item." };

  revalidatePath("/painel/estoque");
  return { sucesso: "Item adicionado à ficha técnica." };
}

export async function removerItemFicha(formData: FormData) {
  const id = String(formData.get("id"));
  const { supabase, empresaId } = await contexto();
  if (!empresaId) return;

  await supabase
    .from("ficha_tecnica_itens")
    .delete()
    .eq("id", id)
    .eq("empresa_id", empresaId);

  revalidatePath("/painel/estoque");
}

// ---------------------------------------------------------
// EQUIPAMENTOS
// ---------------------------------------------------------
const schemaEquipamento = z.object({
  tipo: z.string().trim().min(2, "Informe o tipo de equipamento."),
  categoria: z.enum(["coccao", "preparo", "conservacao", "embalagem", "apoio"]),
  marca_modelo: z.string().trim().optional(),
  capacidade_gn: z.string().trim().optional(),
  capacidade_litros: z.string().trim().optional(),
  quantidade: z.string().trim().optional(),
  dominio_equipe: z.enum(["pleno", "parcial", "baixo"]).optional(),
  restricoes: z.string().trim().optional(),
});

export async function salvarEquipamento(
  _estado: EstadoForm,
  formData: FormData
): Promise<EstadoForm> {
  const parsed = schemaEquipamento.safeParse({
    tipo: formData.get("tipo"),
    categoria: formData.get("categoria"),
    marca_modelo: formData.get("marca_modelo"),
    capacidade_gn: formData.get("capacidade_gn"),
    capacidade_litros: formData.get("capacidade_litros"),
    quantidade: formData.get("quantidade"),
    dominio_equipe: formData.get("dominio_equipe"),
    restricoes: formData.get("restricoes"),
  });

  if (!parsed.success) return { erro: parsed.error.issues[0].message };

  const { supabase, empresaId } = await contexto();
  if (!empresaId) return { erro: "Sessão expirada." };

  const d = parsed.data;
  const { error } = await supabase.from("equipamentos").insert({
    empresa_id: empresaId,
    tipo: d.tipo,
    categoria: d.categoria,
    marca_modelo: d.marca_modelo || null,
    capacidade_gn: d.capacidade_gn ? Number(d.capacidade_gn) : null,
    capacidade_litros: d.capacidade_litros ? Number(d.capacidade_litros) : null,
    quantidade: d.quantidade ? Number(d.quantidade) : 1,
    dominio_equipe: d.dominio_equipe || null,
    restricoes: d.restricoes || null,
  });

  if (error) return { erro: "Não foi possível salvar o equipamento." };

  revalidatePath("/painel/estoque");
  return { sucesso: "Equipamento cadastrado." };
}

// ---------------------------------------------------------
// DOCUMENTOS — upload e leitura
// ---------------------------------------------------------
export async function importarDocumento(
  _estado: EstadoForm,
  formData: FormData
): Promise<EstadoForm> {
  const arquivo = formData.get("arquivo") as File | null;
  if (!arquivo || arquivo.size === 0) {
    return { erro: "Selecione um arquivo." };
  }

  const { supabase, empresaId } = await contexto();
  if (!empresaId) return { erro: "Sessão expirada." };

  const MAX_BYTES = 15 * 1024 * 1024;
  if (arquivo.size > MAX_BYTES) {
    return { erro: "Arquivo maior que 15MB. Envie um arquivo menor." };
  }

  const extensao = arquivo.name.split(".").pop()?.toLowerCase() ?? "";
  const tipoMap: Record<string, "xml_nfe" | "pdf" | "imagem"> = {
    xml: "xml_nfe",
    pdf: "pdf",
    jpg: "imagem",
    jpeg: "imagem",
    png: "imagem",
    webp: "imagem",
  };
  const tipo = tipoMap[extensao];
  if (!tipo) {
    return {
      erro: "Formato não suportado. Envie XML, PDF, JPG, PNG ou WEBP.",
    };
  }

  const bytes = new Uint8Array(await arquivo.arrayBuffer());
  const caminho = `${empresaId}/${Date.now()}-${arquivo.name}`;

  const admin = createAdminClient();

  const { error: erroUpload } = await admin.storage
    .from("documentos")
    .upload(caminho, bytes, { contentType: arquivo.type });

  if (erroUpload) {
    return { erro: "Falha ao enviar o arquivo. Tente novamente." };
  }

  const { data: documento, error: erroInsert } = await admin
    .from("documentos_importados")
    .insert({
      empresa_id: empresaId,
      tipo,
      nome_arquivo: arquivo.name,
      storage_path: caminho,
      status: "processando",
    })
    .select("id")
    .single();

  if (erroInsert || !documento) {
    return { erro: "Falha ao registrar o documento." };
  }

  // Processa de forma síncrona no MVP. Para volumes maiores, isso
  // deve migrar para uma fila (ex.: Supabase Edge Function assíncrona).
  try {
    let extraido;

    if (tipo === "xml_nfe") {
      const texto = new TextDecoder("utf-8").decode(bytes);
      extraido = lerXmlNfe(texto);
    } else {
      const base64 = Buffer.from(bytes).toString("base64");
      const mediaType =
        tipo === "pdf"
          ? ("application/pdf" as const)
          : arquivo.type === "image/png"
            ? ("image/png" as const)
            : arquivo.type === "image/webp"
              ? ("image/webp" as const)
              : ("image/jpeg" as const);
      extraido = await lerDocumentoComIA({ base64, mediaType });
    }

    // Pré-vincula insumos já aprendidos, para o cliente ter menos
    // trabalho de conferência na tela de revisão.
    const itensComVinculo = await Promise.all(
      extraido.itens.map(async (item) => {
        const { data: insumoId } = await admin.rpc(
          "buscar_insumo_aprendido",
          { p_empresa_id: empresaId, p_texto: item.descricao }
        );
        return {
          empresa_id: empresaId,
          documento_id: documento.id,
          descricao_original: item.descricao,
          quantidade: item.quantidade,
          unidade_original: item.unidade,
          valor_unitario: item.valorUnitario,
          valor_total: item.valorTotal,
          insumo_id: insumoId || null,
          confianca_vinculo: insumoId ? "automatico" : null,
        };
      })
    );

    if (itensComVinculo.length > 0) {
      await admin.from("documento_itens").insert(itensComVinculo);
    }

    await admin
      .from("documentos_importados")
      .update({
        status: "aguardando_revisao",
        fornecedor_nome: extraido.fornecedorNome,
        fornecedor_cnpj: extraido.fornecedorCnpj,
        numero_nota: extraido.numeroNota,
        data_emissao: extraido.dataEmissao,
        valor_total: extraido.valorTotal,
        processado_em: new Date().toISOString(),
      })
      .eq("id", documento.id);
  } catch (e) {
    await admin
      .from("documentos_importados")
      .update({
        status: "erro",
        erro_mensagem: e instanceof Error ? e.message : "Erro desconhecido.",
      })
      .eq("id", documento.id);

    return {
      erro:
        e instanceof Error
          ? e.message
          : "Não foi possível ler este documento.",
    };
  }

  revalidatePath("/painel/estoque/documentos");
  return { sucesso: "Documento lido. Revise os itens antes de confirmar." };
}

export async function vincularItemDocumento(formData: FormData) {
  const itemId = String(formData.get("item_id"));
  const insumoId = String(formData.get("insumo_id"));
  const descricaoOriginal = String(formData.get("descricao_original"));
  const ensinar = formData.get("ensinar") === "on";

  const { supabase, empresaId } = await contexto();
  if (!empresaId) return;

  await supabase
    .from("documento_itens")
    .update({ insumo_id: insumoId || null, confianca_vinculo: "manual" })
    .eq("id", itemId)
    .eq("empresa_id", empresaId);

  if (ensinar && insumoId) {
    await supabase.rpc("ensinar_vinculo_insumo", {
      p_empresa_id: empresaId,
      p_texto: descricaoOriginal,
      p_insumo_id: insumoId,
    });
  }

  revalidatePath("/painel/estoque/documentos");
}

export async function confirmarDocumento(formData: FormData) {
  const documentoId = String(formData.get("documento_id"));
  const { supabase, empresaId } = await contexto();
  if (!empresaId) return;

  const { data: itens } = await supabase
    .from("documento_itens")
    .select("insumo_id, quantidade, valor_unitario, incluir")
    .eq("documento_id", documentoId)
    .eq("incluir", true);

  // Atualiza custo unitário (preço mais recente) e soma ao estoque
  // de cada insumo vinculado. Itens sem vínculo são ignorados —
  // o cliente precisa cadastrar o insumo primeiro.
  for (const item of itens ?? []) {
    if (!item.insumo_id) continue;

    const { data: insumo } = await supabase
      .from("insumos")
      .select("estoque_atual")
      .eq("id", item.insumo_id)
      .single();

    await supabase
      .from("insumos")
      .update({
        custo_unitario: item.valor_unitario,
        estoque_atual: (Number(insumo?.estoque_atual) || 0) + Number(item.quantidade),
      })
      .eq("id", item.insumo_id);

    await supabase.from("estoque_movimentos").insert({
      empresa_id: empresaId,
      insumo_id: item.insumo_id,
      tipo: "entrada",
      quantidade: item.quantidade,
      motivo: "Importação de documento",
    });
  }

  // --------------------------------------------------------
  // A nota também é um GASTO. Sem esta parte, o estoque subia
  // mas o CMV do DRE ignorava a compra, o fornecedor não
  // aparecia no Pareto e o painel de desempenho mostrava
  // margem melhor do que a real.
  // --------------------------------------------------------
  // Caixa desmarcada não envia campo nenhum: por isso a checagem é
  // pela presença do "sim", e não pela ausência de um "nao".
  const lancarDespesa = formData.get("lancar_despesa") === "sim";

  if (lancarDespesa) {
    const { data: doc } = await supabase
      .from("documentos_importados")
      .select("fornecedor_nome, numero_nota, valor_total, data_emissao")
      .eq("id", documentoId)
      .eq("empresa_id", empresaId)
      .maybeSingle();

    const valorTotal = Number(doc?.valor_total) || 0;

    if (valorTotal > 0) {
      const vencimentoInformado = formData.get("vencimento");
      const vencimento =
        typeof vencimentoInformado === "string" && vencimentoInformado
          ? vencimentoInformado
          : (doc?.data_emissao ?? new Date().toISOString().slice(0, 10));

      const descricao = doc?.numero_nota
        ? `Compra — NF ${doc.numero_nota}`
        : "Compra de mercadoria";

      // O índice único por documento_id impede lançar a mesma nota
      // duas vezes, mesmo se a confirmação for repetida.
      const { error: erroDespesa } = await supabase
        .from("contas_pagar")
        .insert({
          empresa_id: empresaId,
          documento_id: documentoId,
          descricao,
          fornecedor: doc?.fornecedor_nome ?? null,
          valor: valorTotal,
          vencimento,
          grupo_dre: "cmv",
          status: "pendente",
        });

      if (erroDespesa && !String(erroDespesa.message).includes("duplicate")) {
        await registrarEvento({
          origem: "documentos",
          tipo: "erro",
          mensagem: "Nota confirmada, mas a despesa não foi lançada.",
          empresaId,
          detalhe: { documentoId },
        });
      }
    }
  }

  await supabase
    .from("documentos_importados")
    .update({ status: "confirmado", confirmado_em: new Date().toISOString() })
    .eq("id", documentoId)
    .eq("empresa_id", empresaId);

  revalidatePath("/painel/estoque");
  revalidatePath("/painel/estoque/documentos");
  revalidatePath("/painel/financeiro");
  revalidatePath("/painel");
}

export async function descartarDocumento(formData: FormData) {
  const documentoId = String(formData.get("documento_id"));
  const { supabase, empresaId } = await contexto();
  if (!empresaId) return;

  await supabase
    .from("documentos_importados")
    .update({ status: "descartado" })
    .eq("id", documentoId)
    .eq("empresa_id", empresaId);

  revalidatePath("/painel/estoque/documentos");
}
