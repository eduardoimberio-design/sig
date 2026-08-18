"use server";
import { registrarEvento } from "@/lib/eventos";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { gerarConteudoMarketing } from "@/lib/marketing-ia";

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

const schemaGerar = z.object({
  tipo: z.enum(["post", "carrossel", "story", "campanha"]),
  tema: z.string().trim().min(3, "Descreva o tema ou ocasião."),
});

export async function gerarConteudo(
  _estado: EstadoForm,
  formData: FormData
): Promise<EstadoForm> {
  const parsed = schemaGerar.safeParse({
    tipo: formData.get("tipo"),
    tema: formData.get("tema"),
  });

  if (!parsed.success) return { erro: parsed.error.issues[0].message };

  const { supabase, empresaId } = await contexto();
  if (!empresaId) return { erro: "Sessão expirada." };

  const { data: empresa } = await supabase
    .from("empresas")
    .select("nome")
    .eq("id", empresaId)
    .single();

  const { data: config } = await supabase
    .from("config_marketing")
    .select("*")
    .eq("empresa_id", empresaId)
    .maybeSingle();

  let gerado;
  try {
    gerado = await gerarConteudoMarketing({
      empresaId,
      empresaNome: empresa?.nome ?? "o restaurante",
      tipo: parsed.data.tipo,
      tema: parsed.data.tema,
      configMarketing: {
        tom_voz: config?.tom_voz ?? "caloroso e direto",
        publico_alvo: config?.publico_alvo ?? null,
        diferenciais: config?.diferenciais ?? null,
      },
    });
  } catch (e) {
    await registrarEvento({
      origem: "marketing",
      tipo: "ia_falhou",
      mensagem: e instanceof Error ? e.message : "Falha ao gerar conteúdo.",
      empresaId,
    });
    return {
      erro: e instanceof Error ? e.message : "Falha ao gerar conteúdo.",
    };
  }

  const { error } = await supabase.from("conteudo_marketing").insert({
    empresa_id: empresaId,
    tipo: parsed.data.tipo,
    tema: parsed.data.tema,
    titulo: gerado.titulo,
    legenda: gerado.legenda,
    hashtags: gerado.hashtags,
    slides: gerado.slides,
    status: "rascunho",
  });

  if (error) return { erro: "Conteúdo gerado, mas falhou ao salvar." };

  revalidatePath("/painel/marketing");
  return { sucesso: "Conteúdo gerado." };
}

export async function atualizarStatusConteudo(formData: FormData) {
  const id = String(formData.get("id"));
  const status = String(formData.get("status"));

  const { supabase, empresaId } = await contexto();
  if (!empresaId) return;

  const dados: Record<string, unknown> = { status };
  if (status === "publicado") dados.publicado_em = new Date().toISOString();

  await supabase
    .from("conteudo_marketing")
    .update(dados)
    .eq("id", id)
    .eq("empresa_id", empresaId);

  revalidatePath("/painel/marketing");
}

const schemaConfig = z.object({
  tom_voz: z.string().trim().min(1),
  publico_alvo: z.string().trim().optional(),
  diferenciais: z.string().trim().optional(),
});

export async function salvarConfigMarketing(
  _estado: EstadoForm,
  formData: FormData
): Promise<EstadoForm> {
  const parsed = schemaConfig.safeParse({
    tom_voz: formData.get("tom_voz"),
    publico_alvo: formData.get("publico_alvo"),
    diferenciais: formData.get("diferenciais"),
  });

  if (!parsed.success) return { erro: parsed.error.issues[0].message };

  const { supabase, empresaId } = await contexto();
  if (!empresaId) return { erro: "Sessão expirada." };

  const { error } = await supabase
    .from("config_marketing")
    .update({
      tom_voz: parsed.data.tom_voz,
      publico_alvo: parsed.data.publico_alvo || null,
      diferenciais: parsed.data.diferenciais || null,
    })
    .eq("empresa_id", empresaId);

  if (error) return { erro: "Não foi possível salvar." };

  revalidatePath("/painel/marketing");
  return { sucesso: "Preferências salvas." };
}
