// lib/acessos.ts
//
// A trava de 2 acessos do diagnóstico e da degustação.
//
// COMO FUNCIONA: cada pessoa é contada por duas chaves — o aparelho (hash do IP) e
// o WhatsApp, assim que ela informa. Uma sessão nova consome um acesso em TODAS as
// chaves conhecidas naquele momento; qualquer chave no limite já bloqueia.
//
// Isso é de propósito. Só o aparelho seria contornado com uma janela anônima; só o
// WhatsApp obrigaria a pedir o contato antes de a pessoa ver qualquer coisa. Juntas,
// uma cobre o furo da outra.
//
// O QUE É UMA "SESSÃO": a conversa ou a visita que a pessoa está fazendo agora,
// identificada por um id guardado no navegador dela. Atualizar a página, voltar uma
// tela ou continuar a conversa mantêm o mesmo id, então não consomem outro acesso.
// Entrar de novo depois, sim.
//
// QUANDO BLOQUEIA, NÃO É UM MURO: a pessoa vai para o WhatsApp, onde tem alguém
// para conversar. Duas passadas pelo diagnóstico já indicam interesse real — a
// terceira vale mais como contato humano do que como mais uma conversa com o João.

import { createHash } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { registrarEvento } from "@/lib/eventos";

export type Recurso = "diagnostico" | "degustacao";

/** Dois acessos por recurso, por chave. */
export const LIMITE_ACESSOS = 2;

export const WHATSAPP_CONSULTOR = "+55 11 98550-3734";
/** Formato para link wa.me: só dígitos, com o 55 na frente. */
export const WHATSAPP_LINK = "5511985503734";

export function chaveAparelho(req: Request): string {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "desconhecido";
  // Hash para não guardar IP em claro: não precisamos saber quem é, só contar.
  return createHash("sha256").update(ip).digest("hex").slice(0, 32);
}

/** Normaliza o WhatsApp para servir de chave. Null quando não dá para usar. */
export function chaveWhatsapp(whatsapp: string | null | undefined): string | null {
  if (!whatsapp) return null;
  const digitos = String(whatsapp).replace(/\D/g, "");
  // Menos de 10 dígitos não é telefone brasileiro válido; contar isso como chave
  // agruparia pessoas diferentes sob o mesmo registro.
  return digitos.length >= 10 ? digitos.slice(-11) : null;
}

export interface ResultadoAcesso {
  liberado: boolean;
  /** Quantos acessos a chave mais "gasta" já tem, depois desta verificação. */
  acessos: number;
  /** true quando esta chamada consumiu um acesso (sessão nova). */
  consumiu: boolean;
}

interface Linha {
  id: string;
  acessos: number;
  sessao_atual: string | null;
}

/**
 * Verifica e registra um acesso.
 *
 * `sessao` é o id que o navegador da pessoa guarda. Se bater com a sessão já
 * registrada em alguma chave, nada é consumido — é a mesma visita continuando.
 *
 * Em caso de falha no banco, LIBERA. Uma trava comercial não pode derrubar o funil:
 * perder a contagem de um acesso é barato, barrar um lead legítimo por instabilidade
 * do banco é caro. A falha vai para o Sentinela.
 */
export async function verificarEConsumir(params: {
  recurso: Recurso;
  aparelho: string;
  whatsapp?: string | null;
  sessao: string;
}): Promise<ResultadoAcesso> {
  const { recurso, aparelho, sessao } = params;
  const whats = chaveWhatsapp(params.whatsapp);

  const chaves: { tipo: "aparelho" | "whatsapp"; chave: string }[] = [
    { tipo: "aparelho", chave: aparelho },
  ];
  if (whats) chaves.push({ tipo: "whatsapp", chave: whats });

  try {
    const admin = createAdminClient();

    const { data, error } = await admin
      .from("acessos_funil")
      .select("id, tipo_chave, chave, acessos, sessao_atual")
      .eq("recurso", recurso)
      .in(
        "chave",
        chaves.map((c) => c.chave)
      );

    if (error) throw new Error(error.message);

    const existentes = new Map<string, Linha>();
    for (const linha of data ?? []) {
      existentes.set(`${linha.tipo_chave}:${linha.chave}`, {
        id: linha.id,
        acessos: linha.acessos,
        sessao_atual: linha.sessao_atual,
      });
    }

    // Mesma sessão em qualquer chave = visita continuando, não consome nada.
    const mesmaSessao = chaves.some(
      (c) => existentes.get(`${c.tipo}:${c.chave}`)?.sessao_atual === sessao
    );

    const maiorAtual = chaves.reduce((max, c) => {
      const linha = existentes.get(`${c.tipo}:${c.chave}`);
      return Math.max(max, linha?.acessos ?? 0);
    }, 0);

    if (mesmaSessao) {
      // Já contada antes; o limite dela já foi conferido na entrada.
      return { liberado: maiorAtual <= LIMITE_ACESSOS, acessos: maiorAtual, consumiu: false };
    }

    // Sessão nova: a entrada só vale se ainda houver saldo em TODAS as chaves.
    if (maiorAtual >= LIMITE_ACESSOS) {
      return { liberado: false, acessos: maiorAtual, consumiu: false };
    }

    // Consome em todas as chaves conhecidas, para que a contagem não dependa de
    // por qual delas a pessoa voltar.
    const agora = new Date().toISOString();
    for (const c of chaves) {
      const linha = existentes.get(`${c.tipo}:${c.chave}`);
      if (linha) {
        await admin
          .from("acessos_funil")
          .update({ acessos: linha.acessos + 1, sessao_atual: sessao, ultimo_em: agora })
          .eq("id", linha.id);
      } else {
        await admin.from("acessos_funil").insert({
          recurso,
          tipo_chave: c.tipo,
          chave: c.chave,
          acessos: 1,
          sessao_atual: sessao,
        });
      }
    }

    return { liberado: true, acessos: maiorAtual + 1, consumiu: true };
  } catch (e: any) {
    console.error("[acessos] falha ao verificar:", e?.message ?? e);
    await registrarEvento({
      origem: "funil",
      tipo: "erro",
      mensagem: `Trava de acessos indisponível (${recurso}): ${e?.message ?? e}`,
      detalhe: { recurso },
    });
    // Liberar é o lado seguro: ver comentário acima.
    return { liberado: true, acessos: 0, consumiu: false };
  }
}

/**
 * Registra o WhatsApp numa sessão de diagnóstico já em curso.
 *
 * A pessoa começa a conversa sem se identificar, e só informa o contato algumas
 * mensagens depois. Sem isto, a sessão ficaria contada apenas no aparelho, e
 * trocar de navegador zeraria o contador de quem já se identificou.
 */
export async function vincularWhatsapp(params: {
  recurso: Recurso;
  whatsapp: string | null | undefined;
  sessao: string;
}): Promise<void> {
  const whats = chaveWhatsapp(params.whatsapp);
  if (!whats) return;

  try {
    const admin = createAdminClient();

    const { data: ja } = await admin
      .from("acessos_funil")
      .select("id, sessao_atual")
      .eq("recurso", params.recurso)
      .eq("tipo_chave", "whatsapp")
      .eq("chave", whats)
      .maybeSingle();

    // Esta sessão já foi contada neste WhatsApp: nada a fazer.
    if (ja?.sessao_atual === params.sessao) return;

    if (ja) {
      await admin
        .from("acessos_funil")
        .update({ sessao_atual: params.sessao, ultimo_em: new Date().toISOString() })
        .eq("id", ja.id);
      return;
    }

    await admin.from("acessos_funil").insert({
      recurso: params.recurso,
      tipo_chave: "whatsapp",
      chave: whats,
      // 1, e não 0: a sessão em curso é o primeiro acesso deste WhatsApp.
      acessos: 1,
      sessao_atual: params.sessao,
    });
  } catch (e: any) {
    // Nunca quebra a conversa: a contagem por aparelho segue valendo.
    console.error("[acessos] falha ao vincular whatsapp:", e?.message ?? e);
  }
}

/** A mensagem mostrada a quem chegou ao limite. */
export function mensagemLimite(recurso: Recurso): string {
  const onde =
    recurso === "diagnostico"
      ? "Você já fez o diagnóstico aqui duas vezes"
      : "Você já conheceu o sistema por aqui duas vezes";

  return (
    `${onde} — e, a essa altura, conversar com gente vale mais do que repetir. ` +
    `Chame o Eduardo no WhatsApp ${WHATSAPP_CONSULTOR}: ele olha os seus números ` +
    `caso a caso, sem compromisso.`
  );
}
