"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  gerarIshikawa,
  gerarCincoPorques,
  gerarPlano5W2H,
  gerarSwot,
} from "@/lib/conselheiro-ia";

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

const schemaCaso = z.object({
  titulo: z.string().trim().min(3, "Dê um título curto para o caso."),
  descricao_problema: z.string().trim().min(10, "Descreva o problema com um pouco mais de detalhe."),
  tipo_inicial: z.enum(["ishikawa", "swot"]),
});

export async function criarCaso(
  _estado: EstadoForm,
  formData: FormData
): Promise<EstadoForm> {
  const parsed = schemaCaso.safeParse({
    titulo: formData.get("titulo"),
    descricao_problema: formData.get("descricao_problema"),
    tipo_inicial: formData.get("tipo_inicial"),
  });

  if (!parsed.success) return { erro: parsed.error.issues[0].message };

  const { supabase, empresaId } = await contexto();
  if (!empresaId) return { erro: "Sessão expirada." };

  const { data: caso, error } = await supabase
    .from("casos_conselheiro")
    .insert({
      empresa_id: empresaId,
      titulo: parsed.data.titulo,
      descricao_problema: parsed.data.descricao_problema,
      tipo_inicial: parsed.data.tipo_inicial,
    })
    .select("id")
    .single();

  if (error || !caso) return { erro: "Não foi possível criar o caso." };

  // Gera a primeira ferramenta automaticamente, já que é o motivo
  // do caso existir — evita um clique extra sem necessidade.
  try {
    if (parsed.data.tipo_inicial === "ishikawa") {
      const causas = await gerarIshikawa(empresaId, parsed.data.descricao_problema);
      await supabase
        .from("casos_conselheiro")
        .update({ ishikawa: { causas } })
        .eq("id", caso.id);
    } else {
      const swot = await gerarSwot(empresaId, parsed.data.descricao_problema);
      await supabase.from("casos_conselheiro").update({ swot }).eq("id", caso.id);
    }
  } catch {
    // O caso já foi criado — o cliente pode gerar manualmente depois
    // se a IA falhar aqui (ex.: sem crédito no momento).
  }

  revalidatePath("/painel/consultor/conselheiro");
  return { sucesso: "Caso criado." };
}

export async function gerarIshikawaAction(formData: FormData) {
  const casoId = String(formData.get("caso_id"));
  const problema = String(formData.get("problema"));

  const { supabase, empresaId } = await contexto();
  if (!empresaId) return;

  try {
    const causas = await gerarIshikawa(empresaId, problema);
    await supabase
      .from("casos_conselheiro")
      .update({ ishikawa: { causas } })
      .eq("id", casoId)
      .eq("empresa_id", empresaId);
  } catch {
    // silencioso — a tela mostra "nenhuma causa gerada ainda" se falhar
  }

  revalidatePath("/painel/consultor/conselheiro");
}

export async function salvarIshikawa(formData: FormData) {
  const casoId = String(formData.get("caso_id"));
  const causasJson = String(formData.get("causas"));

  const { supabase, empresaId } = await contexto();
  if (!empresaId) return;

  let causas;
  try {
    causas = JSON.parse(causasJson);
  } catch {
    return;
  }

  await supabase
    .from("casos_conselheiro")
    .update({ ishikawa: { causas } })
    .eq("id", casoId)
    .eq("empresa_id", empresaId);

  revalidatePath("/painel/consultor/conselheiro");
}

export async function gerarCincoPorquesAction(formData: FormData) {
  const casoId = String(formData.get("caso_id"));
  const causaOrigem = String(formData.get("causa_origem"));

  const { supabase, empresaId } = await contexto();
  if (!empresaId) return;

  try {
    const niveis = await gerarCincoPorques(causaOrigem);
    await supabase
      .from("casos_conselheiro")
      .update({ cinco_porques: { causa_origem: causaOrigem, niveis } })
      .eq("id", casoId)
      .eq("empresa_id", empresaId);
  } catch {
    // silencioso
  }

  revalidatePath("/painel/consultor/conselheiro");
}

export async function salvarCincoPorques(formData: FormData) {
  const casoId = String(formData.get("caso_id"));
  const dadosJson = String(formData.get("dados"));

  const { supabase, empresaId } = await contexto();
  if (!empresaId) return;

  let dados;
  try {
    dados = JSON.parse(dadosJson);
  } catch {
    return;
  }

  await supabase
    .from("casos_conselheiro")
    .update({ cinco_porques: dados })
    .eq("id", casoId)
    .eq("empresa_id", empresaId);

  revalidatePath("/painel/consultor/conselheiro");
}

export async function gerarPlano5W2HAction(formData: FormData) {
  const casoId = String(formData.get("caso_id"));
  const causaRaiz = String(formData.get("causa_raiz"));

  const { supabase, empresaId } = await contexto();
  if (!empresaId) return;

  try {
    const novasAcoes = await gerarPlano5W2H(empresaId, causaRaiz);

    const { data: casoAtual } = await supabase
      .from("casos_conselheiro")
      .select("plano_5w2h")
      .eq("id", casoId)
      .single();

    const acoesExistentes = Array.isArray(casoAtual?.plano_5w2h)
      ? casoAtual.plano_5w2h
      : [];

    await supabase
      .from("casos_conselheiro")
      .update({ plano_5w2h: [...acoesExistentes, ...novasAcoes] })
      .eq("id", casoId)
      .eq("empresa_id", empresaId);
  } catch {
    // silencioso
  }

  revalidatePath("/painel/consultor/conselheiro");
}

export async function salvarPlano5W2H(formData: FormData) {
  const casoId = String(formData.get("caso_id"));
  const acoesJson = String(formData.get("acoes"));

  const { supabase, empresaId } = await contexto();
  if (!empresaId) return;

  let acoes;
  try {
    acoes = JSON.parse(acoesJson);
  } catch {
    return;
  }

  await supabase
    .from("casos_conselheiro")
    .update({ plano_5w2h: acoes })
    .eq("id", casoId)
    .eq("empresa_id", empresaId);

  revalidatePath("/painel/consultor/conselheiro");
}

export async function salvarSwot(formData: FormData) {
  const casoId = String(formData.get("caso_id"));
  const swotJson = String(formData.get("swot"));

  const { supabase, empresaId } = await contexto();
  if (!empresaId) return;

  let swot;
  try {
    swot = JSON.parse(swotJson);
  } catch {
    return;
  }

  await supabase
    .from("casos_conselheiro")
    .update({ swot })
    .eq("id", casoId)
    .eq("empresa_id", empresaId);

  revalidatePath("/painel/consultor/conselheiro");
}

export async function atualizarStatusCaso(formData: FormData) {
  const casoId = String(formData.get("caso_id"));
  const status = String(formData.get("status"));

  const { supabase, empresaId } = await contexto();
  if (!empresaId) return;

  await supabase
    .from("casos_conselheiro")
    .update({ status })
    .eq("id", casoId)
    .eq("empresa_id", empresaId);

  revalidatePath("/painel/consultor/conselheiro");
}
