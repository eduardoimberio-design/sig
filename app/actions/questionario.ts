"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type EstadoForm = { erro?: string; sucesso?: string };

const listaDeString = z
  .string()
  .optional()
  .transform((v) => (v ? v.split(",").filter(Boolean) : []));

const numeroOpcional = z
  .string()
  .optional()
  .transform((v) => (v && v.trim() !== "" ? Number(v) : null));

const schema = z.object({
  tipo_servico: z.string().optional(),
  dias_funcionamento: listaDeString,
  refeicoes_dia_media: numeroOpcional,
  refeicoes_dia_pico: numeroOpcional,
  dia_mais_forte: z.string().optional(),
  mes_maior_movimento: z.string().optional(),
  mes_menor_movimento: z.string().optional(),

  qtd_cozinha_por_turno: numeroOpcional,
  nivel_formacao_equipe: z.string().optional(),
  rotatividade_12m: z.string().optional(),
  dependencia_pessoa_chave: z.string().optional(),

  produz_antecipado: z.string().optional(),
  mise_en_place_documentado: z.string().optional(),
  porcionamento_padronizado: z.string().optional(),
  notas_producao_atual: z.string().optional(),

  frequencia_entrega: z.string().optional(),
  prazo_pedido_entrega: z.string().optional(),
  fornecedor_critico_unico: z.string().optional(),

  prioridades: listaDeString,
});

export async function salvarQuestionario(
  _estado: EstadoForm,
  formData: FormData
): Promise<EstadoForm> {
  const raw = Object.fromEntries(formData.entries());
  const parsed = schema.safeParse(raw);

  if (!parsed.success) return { erro: "Alguns campos são inválidos." };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { erro: "Sessão expirada." };

  const { data: vinculo } = await supabase
    .from("usuarios_empresa")
    .select("empresa_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!vinculo) return { erro: "Empresa não encontrada." };

  const d = parsed.data;

  const { error } = await supabase
    .from("questionario_operacional")
    .update({
      tipo_servico: d.tipo_servico || null,
      dias_funcionamento: d.dias_funcionamento,
      refeicoes_dia_media: d.refeicoes_dia_media,
      refeicoes_dia_pico: d.refeicoes_dia_pico,
      dia_mais_forte: d.dia_mais_forte || null,
      mes_maior_movimento: d.mes_maior_movimento || null,
      mes_menor_movimento: d.mes_menor_movimento || null,

      qtd_cozinha_por_turno: d.qtd_cozinha_por_turno,
      nivel_formacao_equipe: d.nivel_formacao_equipe || null,
      rotatividade_12m: d.rotatividade_12m || null,
      dependencia_pessoa_chave: d.dependencia_pessoa_chave || null,

      produz_antecipado: d.produz_antecipado === "on",
      mise_en_place_documentado: d.mise_en_place_documentado === "on",
      porcionamento_padronizado: d.porcionamento_padronizado === "on",
      notas_producao_atual: d.notas_producao_atual || null,

      frequencia_entrega: d.frequencia_entrega || null,
      prazo_pedido_entrega: d.prazo_pedido_entrega || null,
      fornecedor_critico_unico: d.fornecedor_critico_unico || null,

      prioridades: d.prioridades,
      ultima_revisao: new Date().toISOString(),
    })
    .eq("empresa_id", vinculo.empresa_id);

  if (error) return { erro: "Não foi possível salvar o questionário." };

  revalidatePath("/painel/estoque/questionario");
  return { sucesso: "Questionário salvo." };
}
