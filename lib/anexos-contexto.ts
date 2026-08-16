import { createAdminClient } from "@/lib/supabase/admin";
import type { ModuloAnexo } from "@/lib/documentos/leitor-contexto";

/**
 * Devolve, em texto, o que o cliente já confirmou nos anexos daquele
 * agente. Só entra aqui o que passou por confirmação humana — anexo
 * com status "aguardando" nunca alimenta o raciocínio da IA.
 *
 * Devolve string vazia quando não há nada confirmado, para que quem
 * chama possa simplesmente não incluir a seção no prompt.
 */
export async function montarContextoAnexos(
  empresaId: string,
  modulo: ModuloAnexo,
  limite = 8
): Promise<string> {
  const admin = createAdminClient();

  const { data } = await admin
    .from("anexos_contexto")
    .select("nome_arquivo, descricao, resumo_ia, created_at")
    .eq("empresa_id", empresaId)
    .eq("modulo", modulo)
    .eq("status", "confirmado")
    .order("created_at", { ascending: false })
    .limit(limite);

  if (!data || data.length === 0) return "";

  const blocos = data
    .filter((a) => a.resumo_ia)
    .map((a) => {
      const quando = new Date(a.created_at).toLocaleDateString("pt-BR");
      const titulo = a.descricao ?? a.nome_arquivo;
      return `- ${titulo} (enviado em ${quando}): ${a.resumo_ia}`;
    });

  if (blocos.length === 0) return "";

  return [
    "DOCUMENTOS ENVIADOS PELO CLIENTE (conteúdo lido e confirmado por ele):",
    ...blocos,
    "",
    "Use estas informações como fatos do negócio. Se um número aqui contradisser " +
      "outro dado do sistema, aponte a divergência em vez de escolher um dos dois " +
      "por conta própria.",
  ].join("\n");
}
