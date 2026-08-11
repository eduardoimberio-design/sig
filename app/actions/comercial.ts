"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { enviarMensagemTexto } from "@/lib/dialog360";

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

// formData.get() devolve null quando o campo não existe no formulário
// (ex.: checkbox desmarcado) — e z.string().optional() só aceita
// undefined. Este helper evita que isso derrube a validação inteira.
const textoOpcional = z
  .string()
  .nullish()
  .transform((v) => v ?? undefined);

const schemaConfig = z.object({
  ativo: textoOpcional,
  nome_atendente: z.string().trim().min(1, "Informe um nome."),
  mensagem_boas_vindas: z.string().trim().optional(),
  instrucoes_extras: z.string().trim().optional(),
});

export async function salvarConfigComercial(
  _estado: EstadoForm,
  formData: FormData
): Promise<EstadoForm> {
  const parsed = schemaConfig.safeParse({
    ativo: formData.get("ativo"),
    nome_atendente: formData.get("nome_atendente"),
    mensagem_boas_vindas: formData.get("mensagem_boas_vindas"),
    instrucoes_extras: formData.get("instrucoes_extras"),
  });

  if (!parsed.success) return { erro: parsed.error.issues[0].message };

  const { supabase, empresaId } = await contexto();
  if (!empresaId) return { erro: "Sessão expirada." };

  const { error } = await supabase
    .from("config_comercial")
    .update({
      ativo: parsed.data.ativo === "on",
      nome_atendente: parsed.data.nome_atendente,
      mensagem_boas_vindas: parsed.data.mensagem_boas_vindas || null,
      instrucoes_extras: parsed.data.instrucoes_extras || null,
    })
    .eq("empresa_id", empresaId);

  if (error) return { erro: "Não foi possível salvar a configuração." };

  revalidatePath("/painel/comercial");
  return { sucesso: "Configuração salva." };
}

export async function abrirConversa(formData: FormData) {
  const conversaId = String(formData.get("conversa_id"));
  const { supabase } = await contexto();
  await supabase.rpc("marcar_conversa_lida", { p_conversa_id: conversaId });
  revalidatePath("/painel/comercial");
}

export async function assumirConversa(formData: FormData) {
  const conversaId = String(formData.get("conversa_id"));
  const { supabase, empresaId } = await contexto();
  if (!empresaId) return;

  await supabase
    .from("conversas_whatsapp")
    .update({ atribuida_humano: true, status: "transferida_humano" })
    .eq("id", conversaId)
    .eq("empresa_id", empresaId);

  revalidatePath("/painel/comercial");
}

export async function devolverParaAgente(formData: FormData) {
  const conversaId = String(formData.get("conversa_id"));
  const { supabase, empresaId } = await contexto();
  if (!empresaId) return;

  await supabase
    .from("conversas_whatsapp")
    .update({ atribuida_humano: false, status: "aberta" })
    .eq("id", conversaId)
    .eq("empresa_id", empresaId);

  revalidatePath("/painel/comercial");
}

const schemaMensagem = z.object({
  conversa_id: z.string().uuid(),
  telefone: z.string().min(8),
  texto: z.string().trim().min(1, "Digite uma mensagem."),
});

export async function enviarMensagemManual(
  _estado: EstadoForm,
  formData: FormData
): Promise<EstadoForm> {
  const parsed = schemaMensagem.safeParse({
    conversa_id: formData.get("conversa_id"),
    telefone: formData.get("telefone"),
    texto: formData.get("texto"),
  });

  if (!parsed.success) return { erro: parsed.error.issues[0].message };

  const { supabase, empresaId } = await contexto();
  if (!empresaId) return { erro: "Sessão expirada." };

  try {
    await enviarMensagemTexto({
      telefone: parsed.data.telefone,
      texto: parsed.data.texto,
    });
  } catch {
    return {
      erro: "Falha ao enviar pelo WhatsApp. A mensagem não foi registrada.",
    };
  }

  await supabase.from("mensagens_whatsapp").insert({
    conversa_id: parsed.data.conversa_id,
    empresa_id: empresaId,
    remetente: "humano",
    conteudo: parsed.data.texto,
  });

  revalidatePath("/painel/comercial");
  return { sucesso: "" };
}
