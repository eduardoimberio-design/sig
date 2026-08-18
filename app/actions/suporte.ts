"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type EstadoForm = { erro?: string; sucesso?: string };

const esquema = z.object({
  conteudo: z
    .string()
    .trim()
    .min(2, "Escreva sua mensagem.")
    .max(4000, "Mensagem muito longa. Divida em duas."),
});

async function empresaDoUsuario() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, empresaId: null as string | null, user: null };

  const { data } = await supabase
    .from("usuarios_empresa")
    .select("empresa_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  return { supabase, empresaId: data?.empresa_id ?? null, user };
}

/** Mensagem escrita pelo cliente, do painel. */
export async function enviarMensagemCliente(
  _estado: EstadoForm,
  formData: FormData
): Promise<EstadoForm> {
  const parsed = esquema.safeParse({ conteudo: formData.get("conteudo") });
  if (!parsed.success) return { erro: parsed.error.issues[0].message };

  const { supabase, empresaId, user } = await empresaDoUsuario();
  if (!empresaId) return { erro: "Sessão expirada. Entre novamente." };

  const { error } = await supabase.from("mensagens_suporte").insert({
    empresa_id: empresaId,
    autor: "cliente",
    autor_nome: user?.email ?? null,
    conteudo: parsed.data.conteudo,
  });

  if (error) return { erro: "Não consegui enviar. Tente de novo." };

  revalidatePath("/painel/suporte");
  return { sucesso: "Mensagem enviada." };
}

/** Marca como lidas as mensagens que o SIG enviou ao cliente. */
export async function marcarLidasPeloCliente() {
  const { supabase, empresaId } = await empresaDoUsuario();
  if (!empresaId) return;

  await supabase
    .from("mensagens_suporte")
    .update({ lida: true })
    .eq("empresa_id", empresaId)
    .eq("autor", "sig")
    .eq("lida", false);
}

/** Resposta escrita por alguém do SIG, do painel administrativo. */
export async function responderComoSig(
  _estado: EstadoForm,
  formData: FormData
): Promise<EstadoForm> {
  const parsed = esquema.safeParse({ conteudo: formData.get("conteudo") });
  if (!parsed.success) return { erro: parsed.error.issues[0].message };

  const empresaId = formData.get("empresa_id");
  if (typeof empresaId !== "string") return { erro: "Empresa não informada." };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { erro: "Sessão expirada." };

  // A checagem real está na RLS (is_admin_sig). Aqui é só para dar
  // mensagem decente em vez de erro cru do banco.
  const { data: admin } = await supabase
    .from("admins_sig")
    .select("nome")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!admin) return { erro: "Acesso restrito." };

  const { error } = await supabase.from("mensagens_suporte").insert({
    empresa_id: empresaId,
    autor: "sig",
    autor_nome: admin.nome,
    conteudo: parsed.data.conteudo,
  });

  if (error) return { erro: "Não consegui enviar." };

  // As mensagens do cliente naquela conversa passam a lidas: o admin
  // acabou de responder, então obviamente leu.
  await supabase
    .from("mensagens_suporte")
    .update({ lida: true })
    .eq("empresa_id", empresaId)
    .eq("autor", "cliente")
    .eq("lida", false);

  revalidatePath("/admin/suporte");
  return { sucesso: "Resposta enviada." };
}
