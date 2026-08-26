"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type EstadoForm = { erro?: string; sucesso?: string };

const schemaLogin = z.object({
  email: z.string().email("E-mail inválido."),
  senha: z.string().min(1, "Informe a senha."),
});

export async function entrar(
  _estado: EstadoForm,
  formData: FormData
): Promise<EstadoForm> {
  const parsed = schemaLogin.safeParse({
    email: formData.get("email"),
    senha: formData.get("senha"),
  });

  if (!parsed.success) return { erro: parsed.error.issues[0].message };

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email.trim().toLowerCase(),
    password: parsed.data.senha,
  });

  if (error) {
    console.error("[SIG] Falha no login:", error.message);

    // E-mail não confirmado é uma causa distinta e acionável — o
    // usuário precisa saber que deve procurar a caixa de entrada.
    if (error.message.toLowerCase().includes("not confirmed")) {
      return {
        erro: "Seu e-mail ainda não foi confirmado. Procure o link que enviamos na sua caixa de entrada (verifique também o spam).",
      };
    }

    if (error.message.toLowerCase().includes("rate limit")) {
      return {
        erro: "Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo.",
      };
    }

    // Demais casos ficam genéricos de propósito: dizer "esse e-mail
    // não existe" permitiria descobrir quem são os clientes do SIG.
    return { erro: "E-mail ou senha incorretos." };
  }

  revalidatePath("/", "layout");
  redirect("/painel");
}

const schemaCadastro = z.object({
  nome_empresa: z.string().trim().min(2, "Informe o nome do estabelecimento."),
  nome_usuario: z.string().trim().min(2, "Informe seu nome."),
  email: z.string().email("E-mail inválido."),
  telefone: z.string().trim().optional(),
  senha: z.string().min(8, "A senha precisa ter ao menos 8 caracteres."),
  consentimento: z.literal("on", {
    errorMap: () => ({ message: "É necessário aceitar os termos para continuar." }),
  }),
});

export async function cadastrar(
  _estado: EstadoForm,
  formData: FormData
): Promise<EstadoForm> {
  const parsed = schemaCadastro.safeParse({
    nome_empresa: formData.get("nome_empresa"),
    nome_usuario: formData.get("nome_usuario"),
    email: formData.get("email"),
    telefone: formData.get("telefone"),
    senha: formData.get("senha"),
    consentimento: formData.get("consentimento"),
  });

  if (!parsed.success) return { erro: parsed.error.issues[0].message };

  const supabase = createClient();
  const dados = parsed.data;

  // Pode existir uma sessão de um cadastro anterior que criou o
  // usuário mas não chegou a criar a empresa. Nesse caso não se
  // cadastra de novo — só completa o que faltou.
  const {
    data: { user: usuarioAtual },
  } = await supabase.auth.getUser();

  if (!usuarioAtual) {
    const { error: erroSignUp } = await supabase.auth.signUp({
      email: dados.email.trim().toLowerCase(),
      password: dados.senha,
    });

    if (erroSignUp) {
      console.error("[SIG] Falha no signUp:", erroSignUp.message);

      // E-mail já cadastrado: tenta entrar com a senha informada.
      const { error: erroLogin } = await supabase.auth.signInWithPassword({
        email: dados.email.trim().toLowerCase(),
        password: dados.senha,
      });

      if (erroLogin) {
        return {
          erro: `Não foi possível criar a conta: ${erroSignUp.message}`,
        };
      }
    }
  }

  // Se o projeto Supabase exigir confirmação de e-mail, ainda não há sessão.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      sucesso:
        "Conta criada. Confirme seu e-mail pelo link que enviamos e depois faça login para concluir o cadastro do estabelecimento.",
    };
  }

  const { data: resultado, error: erroRpc } = await supabase.rpc(
    "criar_empresa_onboarding",
    {
      p_nome_empresa: dados.nome_empresa,
      p_nome_usuario: dados.nome_usuario,
      p_telefone: dados.telefone || null,
    }
  );

  if (erroRpc || !resultado?.sucesso) {
    console.error("[SIG] Falha ao criar empresa:", erroRpc?.message, resultado);

    // Se a empresa já existe, o cadastro está completo — segue adiante.
    if (resultado?.erro?.includes("já pertence")) {
      revalidatePath("/", "layout");
      redirect("/painel/acesso");
    }

    return {
      erro:
        resultado?.erro ??
        `Falha ao criar a empresa: ${erroRpc?.message ?? "erro desconhecido"}`,
    };
  }

  revalidatePath("/", "layout");
  redirect("/painel/acesso");
}

export async function sair() {
  const supabase = createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

// ---------------------------------------------------------
// RECUPERAÇÃO DE SENHA
// ---------------------------------------------------------
const schemaRecuperar = z.object({
  email: z.string().email("Informe um e-mail válido."),
});

export async function solicitarRecuperacaoSenha(
  _estado: EstadoForm,
  formData: FormData
): Promise<EstadoForm> {
  const parsed = schemaRecuperar.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { erro: parsed.error.issues[0].message };

  const supabase = createClient();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const { error } = await supabase.auth.resetPasswordForEmail(
    parsed.data.email.trim().toLowerCase(),
    { redirectTo: `${baseUrl}/nova-senha` }
  );

  if (error) {
    console.error("[SIG] Falha ao enviar recuperação:", error.message);
  }

  // Resposta idêntica em qualquer caso — confirmar que um e-mail
  // existe permitiria mapear a base de clientes do SIG.
  return {
    sucesso:
      "Se houver uma conta com esse e-mail, enviamos um link para redefinir a senha. Verifique também a caixa de spam.",
  };
}

// A definição de nova senha acontece no navegador (ver
// app/(auth)/nova-senha/page.tsx) — o token vem na âncora da URL,
// que nunca chega ao servidor, então não há sessão aqui para
// autorizar a troca.


const schemaVoucher = z.object({
  codigo: z.string().trim().min(4, "Informe o código do voucher."),
});

export async function resgatarVoucher(
  _estado: EstadoForm,
  formData: FormData
): Promise<EstadoForm> {
  const parsed = schemaVoucher.safeParse({ codigo: formData.get("codigo") });
  if (!parsed.success) return { erro: parsed.error.issues[0].message };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { erro: "Sessão expirada. Faça login novamente." };

  const { data: vinculo } = await supabase
    .from("usuarios_empresa")
    .select("empresa_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!vinculo) return { erro: "Usuário sem empresa vinculada." };

  const { data: resultado, error } = await supabase.rpc("resgatar_voucher", {
    p_codigo: parsed.data.codigo,
    p_empresa_id: vinculo.empresa_id,
  });

  if (error) return { erro: "Falha ao resgatar o voucher." };
  if (!resultado?.sucesso) return { erro: resultado?.erro ?? "Voucher inválido." };

  revalidatePath("/painel", "layout");

  return {
    sucesso: resultado.vitalicio
      ? "Voucher vitalício ativado. Seu acesso não expira."
      : "Voucher ativado com sucesso.",
  };
}

const schemaCompletar = z.object({
  nome_empresa: z.string().trim().min(2, "Informe o nome do estabelecimento."),
  nome_usuario: z.string().trim().min(2, "Informe seu nome."),
  telefone: z.string().trim().optional(),
});

/**
 * Completa o cadastro de quem JÁ está logado mas ainda não tem
 * estabelecimento vinculado.
 *
 * Existe separado do `cadastrar` por um motivo concreto: aquele
 * formulário pedia e-mail e senha de novo e, havendo sessão ativa,
 * ignorava o que fosse digitado — vinculando a empresa à conta logada.
 * Quem digitasse outro e-mail acabava com a empresa na conta errada.
 */
export async function completarCadastro(
  _estado: EstadoForm,
  formData: FormData
): Promise<EstadoForm> {
  const parsed = schemaCompletar.safeParse({
    nome_empresa: formData.get("nome_empresa"),
    nome_usuario: formData.get("nome_usuario"),
    telefone: formData.get("telefone"),
  });

  if (!parsed.success) return { erro: parsed.error.issues[0].message };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { erro: "Sessão expirada. Entre novamente." };

  const { data: resultado, error } = await supabase.rpc(
    "criar_empresa_onboarding",
    {
      p_nome_empresa: parsed.data.nome_empresa,
      p_nome_usuario: parsed.data.nome_usuario,
      p_telefone: parsed.data.telefone || null,
    }
  );

  if (error || !resultado?.sucesso) {
    console.error("[SIG] Falha ao completar cadastro:", error?.message);
    return { erro: "Não consegui concluir o cadastro. Tente de novo." };
  }

  revalidatePath("/", "layout");
  redirect("/painel");
}
