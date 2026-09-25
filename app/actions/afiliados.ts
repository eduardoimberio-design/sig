"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type EstadoForm = { erro?: string; sucesso?: string };

const schemaCadastro = z.object({
  nome: z.string().trim().min(3, "Informe seu nome completo."),
  email: z.string().trim().email("E-mail inválido."),
  senha: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres."),
  whatsapp: z.string().trim().min(10, "Informe um WhatsApp com DDD."),
  profissao: z.string().trim().min(2, "Conte o que você faz."),
  aceite: z.literal("on", {
    errorMap: () => ({ message: "É preciso aceitar os termos do programa." }),
  }),
});

export async function cadastrarAfiliado(
  _estado: EstadoForm,
  formData: FormData
): Promise<EstadoForm> {
  const parsed = schemaCadastro.safeParse({
    nome: formData.get("nome"),
    email: formData.get("email"),
    senha: formData.get("senha"),
    whatsapp: formData.get("whatsapp"),
    profissao: formData.get("profissao"),
    aceite: formData.get("aceite"),
  });

  if (!parsed.success) return { erro: parsed.error.issues[0].message };

  const dados = parsed.data;
  const supabase = createClient();
  const email = dados.email.toLowerCase();

  const {
    data: { user: jaLogado },
  } = await supabase.auth.getUser();

  if (!jaLogado) {
    const { error } = await supabase.auth.signUp({
      email,
      password: dados.senha,
    });

    if (error) {
      const { error: erroLogin } = await supabase.auth.signInWithPassword({
        email,
        password: dados.senha,
      });
      if (erroLogin) {
        return { erro: `Não foi possível criar a conta: ${error.message}` };
      }
    }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      sucesso:
        "Conta criada. Confirme seu e-mail pelo link que enviamos e depois entre para acompanhar sua aprovação.",
    };
  }

  const { data: existente } = await supabase
    .from("afiliados")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!existente) {
    const { error } = await supabase.from("afiliados").insert({
      auth_user_id: user.id,
      nome: dados.nome,
      email,
      whatsapp: dados.whatsapp,
      profissao: dados.profissao,
    });

    if (error) {
      console.error("[afiliados] falha ao cadastrar:", error.message);
      return { erro: "Não consegui concluir o cadastro. Tente de novo." };
    }
  }

  redirect("/afiliado");
}

export async function salvarDadosAfiliado(
  _estado: EstadoForm,
  formData: FormData
): Promise<EstadoForm> {
  const supabase = createClient();

  const { error } = await supabase.rpc("afiliado_atualizar_dados", {
    p_nome: String(formData.get("nome") ?? ""),
    p_whatsapp: String(formData.get("whatsapp") ?? ""),
    p_documento: String(formData.get("documento") ?? ""),
    p_chave_pix: String(formData.get("chave_pix") ?? ""),
    p_profissao: String(formData.get("profissao") ?? ""),
  });

  if (error) return { erro: "Não consegui salvar." };

  revalidatePath("/afiliado");
  return { sucesso: "Dados atualizados." };
}

// =========================================================
// ADMIN
// =========================================================

async function exigirAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from("admins_sig")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  return !!data;
}

/**
 * Código curto, sem caracteres ambíguos (O/0, I/1), mesmo padrão
 * dos vouchers. É o que o afiliado divulga e o cliente digita.
 */
function gerarCodigo() {
  const alfabeto = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 4; i++) {
    s += alfabeto[Math.floor(Math.random() * alfabeto.length)];
  }
  return `AF-${s}`;
}

export async function aprovarAfiliado(formData: FormData) {
  if (!(await exigirAdmin())) return;

  const id = formData.get("id");
  if (typeof id !== "string") return;

  const admin = createAdminClient();

  const { data: atual } = await admin
    .from("afiliados")
    .select("codigo")
    .eq("id", id)
    .maybeSingle();

  // Reaprovação de afiliado suspenso mantém o código antigo:
  // os links que ele já divulgou continuam funcionando.
  let codigo = atual?.codigo ?? null;

  for (let tentativa = 0; !codigo && tentativa < 5; tentativa++) {
    const candidato = gerarCodigo();
    const { data: colisao } = await admin
      .from("afiliados")
      .select("id")
      .eq("codigo", candidato)
      .maybeSingle();
    if (!colisao) codigo = candidato;
  }

  if (!codigo) return;

  await admin
    .from("afiliados")
    .update({
      status: "ativo",
      codigo,
      aprovado_em: new Date().toISOString(),
    })
    .eq("id", id);

  revalidatePath("/admin/afiliados");
}

export async function suspenderAfiliado(formData: FormData) {
  if (!(await exigirAdmin())) return;

  const id = formData.get("id");
  if (typeof id !== "string") return;

  const admin = createAdminClient();
  await admin.from("afiliados").update({ status: "suspenso" }).eq("id", id);

  revalidatePath("/admin/afiliados");
}

/**
 * Marca como paga toda comissão pendente do afiliado. Usar depois
 * de fazer o Pix — o sistema não transfere dinheiro, só registra.
 */
export async function marcarComissoesPagas(formData: FormData) {
  if (!(await exigirAdmin())) return;

  const id = formData.get("id");
  if (typeof id !== "string") return;

  const admin = createAdminClient();
  await admin
    .from("comissoes")
    .update({ status: "paga", pago_em: new Date().toISOString() })
    .eq("afiliado_id", id)
    .eq("status", "pendente");

  revalidatePath("/admin/afiliados");
}
