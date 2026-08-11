"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type EstadoForm = { erro?: string; sucesso?: string; codigos?: string[] };

const textoOpcional = z
  .string()
  .nullish()
  .transform((v) => v ?? undefined);

const schemaVouchers = z.object({
  quantidade: z.string().transform((v) => Number(v || 1)),
  tipo: z.string(),          // '30' | '60' | '90' | 'vitalicio'
  descricao: z.string().trim().min(3, "Descreva para que serve este lote."),
  validade_resgate: textoOpcional,
});

export async function gerarVouchers(
  _estado: EstadoForm,
  formData: FormData
): Promise<EstadoForm> {
  const parsed = schemaVouchers.safeParse({
    quantidade: formData.get("quantidade"),
    tipo: formData.get("tipo"),
    descricao: formData.get("descricao"),
    validade_resgate: formData.get("validade_resgate"),
  });

  if (!parsed.success) return { erro: parsed.error.issues[0].message };

  const supabase = createClient();
  const vitalicio = parsed.data.tipo === "vitalicio";

  const { data, error } = await supabase.rpc("admin_gerar_vouchers", {
    p_quantidade: parsed.data.quantidade,
    p_duracao_dias: vitalicio ? null : Number(parsed.data.tipo),
    p_vitalicio: vitalicio,
    p_descricao: parsed.data.descricao,
    p_validade_resgate: parsed.data.validade_resgate || null,
  });

  if (error) {
    return { erro: error.message.includes("administradores")
      ? "Acesso restrito a administradores do SIG."
      : "Não foi possível gerar os vouchers." };
  }

  revalidatePath("/admin");
  return {
    sucesso: `${parsed.data.quantidade} voucher(s) gerado(s).`,
    codigos: (data ?? []).map((d: any) => d.codigo),
  };
}

const schemaAcesso = z.object({
  empresa_id: z.string().uuid(),
  dias: z.string(),
});

export async function concederAcesso(
  _estado: EstadoForm,
  formData: FormData
): Promise<EstadoForm> {
  const parsed = schemaAcesso.safeParse({
    empresa_id: formData.get("empresa_id"),
    dias: formData.get("dias"),
  });

  if (!parsed.success) return { erro: "Dados inválidos." };

  const supabase = createClient();
  const vitalicio = parsed.data.dias === "vitalicio";

  const { data, error } = await supabase.rpc("admin_conceder_acesso", {
    p_empresa_id: parsed.data.empresa_id,
    p_dias: vitalicio ? 0 : Number(parsed.data.dias),
    p_vitalicio: vitalicio,
  });

  if (error || !data?.sucesso) {
    return { erro: data?.erro ?? "Não foi possível conceder o acesso." };
  }

  revalidatePath("/admin");
  return { sucesso: "Acesso concedido." };
}
