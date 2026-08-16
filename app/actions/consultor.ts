"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { coletarAnaliseEstruturada } from "@/lib/consultor-dados";
import { gerarRelatorioConsultor } from "@/lib/consultor-ia";

export type EstadoForm = { erro?: string; sucesso?: string };

export async function gerarRelatorio(
  _estado: EstadoForm,
  formData: FormData
): Promise<EstadoForm> {
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

  const { data: empresa } = await supabase
    .from("empresas")
    .select("nome")
    .eq("id", vinculo.empresa_id)
    .single();

  const inicio = String(formData.get("inicio"));
  const fim = String(formData.get("fim"));

  if (!inicio || !fim) return { erro: "Informe o período." };

  let dados;
  try {
    dados = await coletarAnaliseEstruturada(vinculo.empresa_id, inicio, fim);
  } catch {
    return { erro: "Falha ao coletar os dados do período." };
  }

  let relatorio;
  try {
    relatorio = await gerarRelatorioConsultor(dados, empresa?.nome ?? "seu negócio", vinculo.empresa_id);
  } catch (e) {
    return {
      erro: e instanceof Error ? e.message : "Falha ao gerar o relatório.",
    };
  }

  const admin = createAdminClient();

  const { data: relatorioSalvo, error: erroSalvar } = await admin
    .from("relatorios_consultor")
    .insert({
      empresa_id: vinculo.empresa_id,
      periodo_inicio: inicio,
      periodo_fim: fim,
      conteudo: relatorio.conteudo,
      dados_estruturados: dados,
      gerado_por: "manual",
    })
    .select("id")
    .single();

  if (erroSalvar || !relatorioSalvo) {
    return { erro: "Relatório gerado, mas falhou ao salvar." };
  }

  if (relatorio.recomendacoes.length > 0) {
    await admin.from("recomendacoes").insert(
      relatorio.recomendacoes.map((r) => ({
        empresa_id: vinculo.empresa_id,
        relatorio_id: relatorioSalvo.id,
        categoria: r.categoria,
        titulo: r.titulo,
        descricao: r.descricao,
        impacto_estimado: r.impacto_estimado,
      }))
    );
  }

  revalidatePath("/painel/consultor");
  return { sucesso: "Relatório gerado." };
}

export async function marcarRecomendacao(formData: FormData) {
  const id = String(formData.get("id"));
  const status = String(formData.get("status")) as "aplicada" | "descartada";

  const supabase = createClient();
  await supabase.rpc("marcar_recomendacao", { p_id: id, p_status: status });

  revalidatePath("/painel/consultor");
}
