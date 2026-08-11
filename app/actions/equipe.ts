"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

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
// — e z.string().optional() só aceita undefined, não null. Este helper
// evita que um campo ausente derrube a validação inteira.
const textoOpcional = z
  .string()
  .nullish()
  .transform((v) => v ?? undefined);

// ---------------------------------------------------------
// ESCALA
// ---------------------------------------------------------
const schemaEscala = z.object({
  colaborador_id: z.string().uuid("Selecione um colaborador."),
  dia_semana: z.string().min(1),
  turno: z.string().min(1),
  horario_entrada: textoOpcional,
  horario_saida: textoOpcional,
});

export async function adicionarEscala(
  _estado: EstadoForm,
  formData: FormData
): Promise<EstadoForm> {
  const parsed = schemaEscala.safeParse({
    colaborador_id: formData.get("colaborador_id"),
    dia_semana: formData.get("dia_semana"),
    turno: formData.get("turno"),
    horario_entrada: formData.get("horario_entrada"),
    horario_saida: formData.get("horario_saida"),
  });

  if (!parsed.success) return { erro: parsed.error.issues[0].message };

  const { supabase, empresaId } = await contexto();
  if (!empresaId) return { erro: "Sessão expirada." };

  const { error } = await supabase.from("escala_trabalho").insert({
    empresa_id: empresaId,
    colaborador_id: parsed.data.colaborador_id,
    dia_semana: parsed.data.dia_semana,
    turno: parsed.data.turno,
    horario_entrada: parsed.data.horario_entrada || null,
    horario_saida: parsed.data.horario_saida || null,
  });

  if (error) {
    if (error.code === "23505") {
      return { erro: "Este colaborador já está escalado nesse dia e turno." };
    }
    return { erro: "Não foi possível salvar a escala." };
  }

  revalidatePath("/painel/equipe");
  return { sucesso: "Escala adicionada." };
}

export async function removerEscala(formData: FormData) {
  const id = String(formData.get("id"));
  const { supabase, empresaId } = await contexto();
  if (!empresaId) return;

  await supabase
    .from("escala_trabalho")
    .delete()
    .eq("id", id)
    .eq("empresa_id", empresaId);

  revalidatePath("/painel/equipe");
}

// ---------------------------------------------------------
// AUSÊNCIAS
// ---------------------------------------------------------
const schemaAusencia = z.object({
  colaborador_id: z.string().uuid("Selecione um colaborador."),
  data: z.string().min(10, "Informe a data."),
  tipo: z.enum(["folga", "ferias", "atestado", "falta"]),
  observacoes: textoOpcional,
});

export async function registrarAusencia(
  _estado: EstadoForm,
  formData: FormData
): Promise<EstadoForm> {
  const parsed = schemaAusencia.safeParse({
    colaborador_id: formData.get("colaborador_id"),
    data: formData.get("data"),
    tipo: formData.get("tipo"),
    observacoes: formData.get("observacoes"),
  });

  if (!parsed.success) return { erro: parsed.error.issues[0].message };

  const { supabase, empresaId } = await contexto();
  if (!empresaId) return { erro: "Sessão expirada." };

  const { error } = await supabase.from("ausencias").insert({
    empresa_id: empresaId,
    colaborador_id: parsed.data.colaborador_id,
    data: parsed.data.data,
    tipo: parsed.data.tipo,
    observacoes: parsed.data.observacoes || null,
  });

  if (error) return { erro: "Não foi possível registrar." };

  revalidatePath("/painel/equipe");
  return { sucesso: "Ausência registrada." };
}

export async function removerAusencia(formData: FormData) {
  const id = String(formData.get("id"));
  const { supabase, empresaId } = await contexto();
  if (!empresaId) return;

  await supabase
    .from("ausencias")
    .delete()
    .eq("id", id)
    .eq("empresa_id", empresaId);

  revalidatePath("/painel/equipe");
}

// ---------------------------------------------------------
// TREINAMENTOS
// ---------------------------------------------------------
const schemaTreinamento = z.object({
  titulo: z.string().trim().min(2, "Informe o título."),
  descricao: textoOpcional,
  data_realizacao: z.string().min(10, "Informe a data."),
  carga_horas: textoOpcional,
  participantes: textoOpcional, // ids separados por vírgula
});

export async function registrarTreinamento(
  _estado: EstadoForm,
  formData: FormData
): Promise<EstadoForm> {
  const parsed = schemaTreinamento.safeParse({
    titulo: formData.get("titulo"),
    descricao: formData.get("descricao"),
    data_realizacao: formData.get("data_realizacao"),
    carga_horas: formData.get("carga_horas"),
    participantes: formData.get("participantes"),
  });

  if (!parsed.success) return { erro: parsed.error.issues[0].message };

  const { supabase, empresaId } = await contexto();
  if (!empresaId) return { erro: "Sessão expirada." };

  const { data: treinamento, error } = await supabase
    .from("treinamentos")
    .insert({
      empresa_id: empresaId,
      titulo: parsed.data.titulo,
      descricao: parsed.data.descricao || null,
      data_realizacao: parsed.data.data_realizacao,
      carga_horas: parsed.data.carga_horas
        ? Number(parsed.data.carga_horas)
        : null,
    })
    .select("id")
    .single();

  if (error || !treinamento) return { erro: "Não foi possível salvar." };

  const idsParticipantes = parsed.data.participantes
    ? parsed.data.participantes.split(",").filter(Boolean)
    : [];

  if (idsParticipantes.length > 0) {
    await supabase.from("treinamento_participantes").insert(
      idsParticipantes.map((colaboradorId) => ({
        empresa_id: empresaId,
        treinamento_id: treinamento.id,
        colaborador_id: colaboradorId,
      }))
    );
  }

  revalidatePath("/painel/equipe");
  return { sucesso: "Treinamento registrado." };
}
