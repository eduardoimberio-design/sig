import { createAdminClient } from "@/lib/supabase/admin";

export type OrigemEvento =
  | "joao"
  | "anexos"
  | "consultor"
  | "conselheiro"
  | "marketing"
  | "documentos"
  | "pagamento"
  | "suporte";

export type TipoEvento =
  | "ia_falhou"
  | "leitura_falhou"
  | "pagamento_falhou"
  | "limite_atingido"
  | "erro";

/**
 * Registra uma falha para o Sentinela analisar depois.
 *
 * Nunca lança exceção: se a própria gravação falhar, engole o erro
 * e segue. Um sistema de log que derruba a operação que estava
 * monitorando é pior do que não ter log nenhum.
 *
 * Não passe dado sensível do cliente em `detalhe` — isso fica
 * visível no painel administrativo.
 */
export async function registrarEvento(params: {
  origem: OrigemEvento;
  tipo: TipoEvento;
  mensagem: string;
  severidade?: "aviso" | "erro" | "critico";
  empresaId?: string | null;
  detalhe?: Record<string, unknown>;
}): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from("eventos_sistema").insert({
      empresa_id: params.empresaId ?? null,
      origem: params.origem,
      tipo: params.tipo,
      severidade: params.severidade ?? "erro",
      mensagem: params.mensagem.slice(0, 500),
      detalhe: params.detalhe ?? null,
    });
  } catch (e) {
    console.error("[eventos] não consegui registrar:", e);
  }
}
