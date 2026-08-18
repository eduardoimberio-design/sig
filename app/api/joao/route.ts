import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { responderJoao, type MensagemJoao } from "@/lib/joao-ia";
import { registrarEvento } from "@/lib/eventos";

export const dynamic = "force-dynamic";

// Tetos diários. O público é baixo de propósito: é a porta aberta
// para a internet inteira e cada mensagem custa crédito.
const LIMITE_PUBLICO = 15;
const LIMITE_CLIENTE = 60;

const MAX_HISTORICO = 12;
const MAX_CARACTERES = 1000;

function chaveVisitante(req: Request) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "desconhecido";
  // Hash para não guardar IP em claro — não precisamos saber quem é,
  // só contar quantas vezes veio.
  return "ip:" + createHash("sha256").update(ip).digest("hex").slice(0, 32);
}

async function registrarUso(
  chave: string,
  origem: "publico" | "cliente",
  limite: number
): Promise<boolean> {
  const admin = createAdminClient();
  const hoje = new Date().toISOString().slice(0, 10);

  const { data: atual } = await admin
    .from("joao_uso")
    .select("id, mensagens")
    .eq("chave", chave)
    .eq("dia", hoje)
    .maybeSingle();

  if (atual) {
    if (atual.mensagens >= limite) return false;
    await admin
      .from("joao_uso")
      .update({ mensagens: atual.mensagens + 1, updated_at: new Date().toISOString() })
      .eq("id", atual.id);
    return true;
  }

  await admin
    .from("joao_uso")
    .insert({ chave, origem, dia: hoje, mensagens: 1 });
  return true;
}

export async function POST(req: Request) {
  let corpo: any;
  try {
    corpo = await req.json();
  } catch {
    return NextResponse.json({ erro: "Requisição inválida." }, { status: 400 });
  }

  const mensagensBrutas = Array.isArray(corpo?.mensagens) ? corpo.mensagens : [];
  const telaAtual =
    typeof corpo?.telaAtual === "string" ? corpo.telaAtual.slice(0, 120) : null;

  const mensagens: MensagemJoao[] = mensagensBrutas
    .filter(
      (m: any) =>
        (m?.role === "user" || m?.role === "assistant") &&
        typeof m?.content === "string" &&
        m.content.trim()
    )
    .slice(-MAX_HISTORICO)
    .map((m: any) => ({
      role: m.role,
      content: String(m.content).slice(0, MAX_CARACTERES),
    }));

  if (mensagens.length === 0) {
    return NextResponse.json({ erro: "Escreva uma pergunta." }, { status: 400 });
  }

  // Quem está falando?
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let modo: "publico" | "cliente" = "publico";
  let chave = chaveVisitante(req);
  let empresaNome: string | null = null;

  if (user) {
    const { data: empresa } = await supabase
      .from("minha_empresa")
      .select("id, nome")
      .maybeSingle();

    if (empresa) {
      modo = "cliente";
      chave = "empresa:" + empresa.id;
      empresaNome = empresa.nome ?? null;
    }
  }

  const limite = modo === "cliente" ? LIMITE_CLIENTE : LIMITE_PUBLICO;
  const liberado = await registrarUso(chave, modo, limite);

  if (!liberado) {
    return NextResponse.json(
      {
        erro:
          modo === "cliente"
            ? "Você chegou ao limite de conversas com o João por hoje. Amanhã ele volta — e para dúvidas urgentes use o WhatsApp no topo da tela."
            : "Limite de conversas por hoje atingido. Se quiser falar com alguém do SIG, chame no WhatsApp.",
      },
      { status: 429 }
    );
  }

  // Planos só interessam a quem ainda não é cliente.
  let planos: { nome: string; preco: number; dias: number }[] | undefined;
  if (modo === "publico") {
    const admin = createAdminClient();
    const { data } = await admin
      .from("planos")
      .select("nome, preco, duracao_dias")
      .eq("ativo", true)
      .order("ordem_exibicao");
    planos = (data ?? []).map((p) => ({
      nome: p.nome,
      preco: Number(p.preco),
      dias: p.duracao_dias,
    }));
  }

  try {
    const resultado = await responderJoao({
      mensagens,
      modo,
      telaAtual,
      planos,
      empresaNome,
    });
    return NextResponse.json(resultado);
  } catch (e: any) {
    // Sem isto, a falha morre em silêncio e não há como diagnosticar.
    console.error("[João] falha ao responder:", e?.message ?? e);

    await registrarEvento({
      origem: "joao",
      tipo: "ia_falhou",
      mensagem: e?.message ?? "Falha ao responder.",
      detalhe: { modo, tela: telaAtual },
    });

    return NextResponse.json(
      {
        erro:
          "O João não conseguiu responder agora. Tente de novo em instantes — ou chame no WhatsApp.",
        // Só em desenvolvimento: em produção o cliente não vê detalhe interno.
        detalhe:
          process.env.NODE_ENV !== "production"
            ? (e?.message ?? String(e))
            : undefined,
      },
      { status: 500 }
    );
  }
}
