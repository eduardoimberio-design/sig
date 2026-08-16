"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  lerAnexoContexto,
  type ModuloAnexo,
} from "@/lib/documentos/leitor-contexto";

export type EstadoForm = { erro?: string; sucesso?: string };

const MODULOS: ModuloAnexo[] = [
  "financeiro",
  "estoque",
  "marketing",
  "equipe",
  "conselheiro",
];

const ROTA_POR_MODULO: Record<ModuloAnexo, string> = {
  financeiro: "/painel/financeiro",
  estoque: "/painel/estoque",
  marketing: "/painel/marketing",
  equipe: "/painel/equipe",
  conselheiro: "/painel/consultor/conselheiro",
};

async function contexto() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { empresaId: null as string | null };

  const { data } = await supabase
    .from("usuarios_empresa")
    .select("empresa_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  return { empresaId: data?.empresa_id ?? null };
}

function moduloValido(valor: unknown): ModuloAnexo | null {
  return MODULOS.includes(valor as ModuloAnexo) ? (valor as ModuloAnexo) : null;
}

/**
 * Recebe o arquivo, guarda no storage e manda a IA ler. O resumo
 * nasce com status "aguardando" — não é usado por nenhum agente
 * até o cliente conferir e confirmar.
 */
export async function enviarAnexo(
  _estado: EstadoForm,
  formData: FormData
): Promise<EstadoForm> {
  const modulo = moduloValido(formData.get("modulo"));
  if (!modulo) return { erro: "Agente não identificado." };

  const arquivo = formData.get("arquivo") as File | null;
  if (!arquivo || arquivo.size === 0) {
    return { erro: "Selecione um arquivo." };
  }

  const descricaoBruta = formData.get("descricao");
  const descricao =
    typeof descricaoBruta === "string" && descricaoBruta.trim()
      ? descricaoBruta.trim().slice(0, 300)
      : null;

  const { empresaId } = await contexto();
  if (!empresaId) return { erro: "Sessão expirada. Entre novamente." };

  const MAX_BYTES = 15 * 1024 * 1024;
  if (arquivo.size > MAX_BYTES) {
    return { erro: "Arquivo maior que 15MB. Envie um arquivo menor." };
  }

  const extensao = arquivo.name.split(".").pop()?.toLowerCase() ?? "";
  const mediaPorExtensao: Record<
    string,
    "application/pdf" | "image/jpeg" | "image/png" | "image/webp"
  > = {
    pdf: "application/pdf",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
  };
  const mediaType = mediaPorExtensao[extensao];
  if (!mediaType) {
    return { erro: "Formato não suportado. Envie PDF, JPG, PNG ou WEBP." };
  }

  const bytes = Buffer.from(await arquivo.arrayBuffer());
  const caminho = `${empresaId}/anexos/${modulo}/${Date.now()}-${arquivo.name}`;

  const admin = createAdminClient();

  const { error: erroUpload } = await admin.storage
    .from("documentos")
    .upload(caminho, bytes, { contentType: arquivo.type });

  if (erroUpload) {
    return { erro: "Falha ao enviar o arquivo. Tente novamente." };
  }

  let resumo: string | null = null;
  let avisoLeitura: string | null = null;

  try {
    resumo = await lerAnexoContexto({
      base64: bytes.toString("base64"),
      mediaType,
      modulo,
      descricao,
    });
  } catch (e: any) {
    // O arquivo fica guardado mesmo se a leitura falhar. O cliente
    // pode escrever o resumo à mão em vez de perder o envio.
    avisoLeitura =
      e?.message ?? "O arquivo foi guardado, mas a leitura automática falhou.";
  }

  const { error: erroInsert } = await admin.from("anexos_contexto").insert({
    empresa_id: empresaId,
    modulo,
    nome_arquivo: arquivo.name,
    storage_path: caminho,
    tipo_arquivo: mediaType === "application/pdf" ? "pdf" : "imagem",
    tamanho_bytes: arquivo.size,
    descricao,
    resumo_ia: resumo,
    status: "aguardando",
  });

  if (erroInsert) {
    return { erro: "Falha ao registrar o arquivo." };
  }

  revalidatePath(ROTA_POR_MODULO[modulo]);

  return avisoLeitura
    ? { erro: avisoLeitura }
    : {
        sucesso:
          "Arquivo lido. Confira abaixo se a leitura está correta antes de confirmar.",
      };
}

const esquemaConfirmacao = z.object({
  id: z.string().uuid(),
  resumo: z
    .string()
    .trim()
    .min(5, "Escreva o que este arquivo mostra.")
    .max(4000, "Resumo muito longo."),
});

/**
 * Confirma (com eventual correção do cliente) o que o arquivo diz.
 * Só a partir daqui o conteúdo entra no raciocínio dos agentes.
 */
export async function confirmarAnexo(
  _estado: EstadoForm,
  formData: FormData
): Promise<EstadoForm> {
  const modulo = moduloValido(formData.get("modulo"));
  if (!modulo) return { erro: "Agente não identificado." };

  const parse = esquemaConfirmacao.safeParse({
    id: formData.get("id"),
    resumo: formData.get("resumo"),
  });

  if (!parse.success) {
    return { erro: parse.error.errors[0]?.message ?? "Dados inválidos." };
  }

  const { empresaId } = await contexto();
  if (!empresaId) return { erro: "Sessão expirada. Entre novamente." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("anexos_contexto")
    .update({ resumo_ia: parse.data.resumo, status: "confirmado" })
    .eq("id", parse.data.id)
    .eq("empresa_id", empresaId);

  if (error) return { erro: "Falha ao confirmar." };

  revalidatePath(ROTA_POR_MODULO[modulo]);
  return { sucesso: "Confirmado. O agente já pode usar esta informação." };
}

export async function excluirAnexo(
  _estado: EstadoForm,
  formData: FormData
): Promise<EstadoForm> {
  const modulo = moduloValido(formData.get("modulo"));
  const id = formData.get("id");
  if (!modulo || typeof id !== "string") {
    return { erro: "Não foi possível identificar o arquivo." };
  }

  const { empresaId } = await contexto();
  if (!empresaId) return { erro: "Sessão expirada. Entre novamente." };

  const admin = createAdminClient();

  const { data: anexo } = await admin
    .from("anexos_contexto")
    .select("storage_path")
    .eq("id", id)
    .eq("empresa_id", empresaId)
    .maybeSingle();

  if (anexo?.storage_path) {
    await admin.storage.from("documentos").remove([anexo.storage_path]);
  }

  const { error } = await admin
    .from("anexos_contexto")
    .delete()
    .eq("id", id)
    .eq("empresa_id", empresaId);

  if (error) return { erro: "Falha ao excluir." };

  revalidatePath(ROTA_POR_MODULO[modulo]);
  return { sucesso: "Arquivo removido." };
}
