import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  responderJoao,
  type MensagemJoao,
  type LeadConversa,
} from "@/lib/joao-ia";
import { registrarEvento } from "@/lib/eventos";

export const dynamic = "force-dynamic";

// Tetos diários. O limite público subiu de 15 para 40: na página de diagnóstico o
// João conduz a conversa inteira (contato, números, diagnóstico, fechamento), o que
// consome muito mais mensagens que responder "onde fica X". 40 dá folga sem abrir
// demais a porta — a página é pública para a internet inteira e cada mensagem custa.
const LIMITE_PUBLICO = 40;
const LIMITE_CLIENTE = 60;

// Histórico maior pelo mesmo motivo: no fim da conversa o João precisa lembrar do
// faturamento dito 15 mensagens atrás para montar o diagnóstico.
const MAX_HISTORICO = 30;
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

/**
 * Grava (ou atualiza) o lead apurado na conversa.
 *
 * O João envia o lead duas vezes: uma ao entregar o diagnóstico e outra no fim,
 * já sabendo como a conversa terminou. Por isso a gravação é "upsert manual":
 * procura um lead da mesma pessoa criado nas últimas horas e atualiza, em vez de
 * criar duas linhas para a mesma conversa.
 *
 * Falha aqui NUNCA quebra a conversa: se o banco recusar, a pessoa continua
 * recebendo o diagnóstico normalmente e o erro fica registrado. Perder o registro
 * é ruim; travar a conversa na frente do lead é pior.
 */
async function gravarLead(
  lead: LeadConversa,
  mensagens: MensagemJoao[]
): Promise<void> {
  // Sem consentimento explícito, nada é gravado. Essa é a regra, não uma
  // preferência — o João é instruído a pedir antes de qualquer pergunta.
  if (!lead.consentimentoLgpd) return;

  // Sem nome nem WhatsApp não há lead utilizável: seria uma linha órfã no banco.
  if (!lead.nome && !lead.whatsapp) return;

  const admin = createAdminClient();

  // Transcrição serve de contexto: os campos estruturados nunca capturam tudo que
  // a pessoa contou sobre o negócio dela.
  const transcricao = mensagens
    .map((m) => `${m.role === "user" ? "Lead" : "João"}: ${m.content}`)
    .join("\n\n")
    .slice(0, 12000);

  const dados = {
    nome: lead.nome ?? "(não informado)",
    whatsapp: lead.whatsapp ?? "",
    email: lead.email,
    cidade: lead.cidade,
    estabelecimento: lead.estabelecimento,
    tipo_negocio: lead.tipoNegocio,
    numero_funcionarios: lead.numeroFuncionarios,
    itens_cardapio: lead.itensCardapio,
    volume_vendas_mes: lead.volumeVendasMes,
    descricao_operacao: lead.descricaoOperacao,
    faturamento_mensal: lead.faturamentoMensal,
    compras_mensal: lead.comprasMensal,
    custo_funcionarios_mensal: lead.custoFuncionariosMensal,
    cmv_percentual:
      lead.comprasMensal && lead.faturamentoMensal
        ? (lead.comprasMensal / lead.faturamentoMensal) * 100
        : null,
    custo_pessoal_percentual:
      lead.custoFuncionariosMensal && lead.faturamentoMensal
        ? (lead.custoFuncionariosMensal / lead.faturamentoMensal) * 100
        : null,
    prime_cost_percentual:
      lead.comprasMensal && lead.custoFuncionariosMensal && lead.faturamentoMensal
        ? ((lead.comprasMensal + lead.custoFuncionariosMensal) /
            lead.faturamentoMensal) *
          100
        : null,
    maior_preocupacao: lead.maiorPreocupacao,
    desafio_livre: lead.desafioLivre,
    interesse_final: lead.interesseFinal,
    // Estas duas colunas nasceram obrigatórias (quando só o formulário gravava) e
    // travaram a gravação de leads de conversa por um tempo. A 0026 tornou opcionais,
    // mas o texto de apoio continua útil no painel — evita ter que abrir a
    // transcrição inteira para saber o que foi diagnosticado.
    causa_raiz: lead.causaRaiz,
    acao_recomendada: lead.acaoRecomendada,
    consentimento_lgpd: true,
    canal: "conversa_joao",
    transcricao,
  };

  // Janela de 6 horas: tempo mais que suficiente para uma conversa, e curto o
  // bastante para que o mesmo lead voltando dias depois vire um registro novo.
  const seisHorasAtras = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();

  let existenteId: string | null = null;
  if (lead.whatsapp) {
    const { data } = await admin
      .from("leads_diagnostico")
      .select("id")
      .eq("whatsapp", lead.whatsapp)
      .eq("canal", "conversa_joao")
      .gte("created_at", seisHorasAtras)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    existenteId = data?.id ?? null;
  }

  const { error } = existenteId
    ? await admin.from("leads_diagnostico").update(dados).eq("id", existenteId)
    : await admin.from("leads_diagnostico").insert(dados);

  if (!error) return;

  console.error("[João] falha ao gravar lead:", error.message);
  await registrarEvento({
    origem: "joao",
    tipo: "lead_nao_gravado",
    mensagem: error.message,
    detalhe: { nome: lead.nome, whatsapp: lead.whatsapp },
  });

  // Segunda tentativa com o mínimo indispensável. Se a primeira falhou por causa de
  // alguma coluna específica (constraint, tipo, valor fora de uma lista permitida),
  // é melhor salvar o contato e a transcrição do que perder o lead inteiro — a
  // conversa completa está ali e pode ser lida depois.
  if (existenteId) return;

  const { error: erroFallback } = await admin.from("leads_diagnostico").insert({
    nome: lead.nome ?? "(não informado)",
    whatsapp: lead.whatsapp,
    email: lead.email,
    consentimento_lgpd: true,
    canal: "conversa_joao",
    transcricao,
  });

  if (erroFallback) {
    console.error("[João] fallback também falhou:", erroFallback.message);
    await registrarEvento({
      origem: "joao",
      tipo: "lead_perdido",
      mensagem: erroFallback.message,
      detalhe: { nome: lead.nome, whatsapp: lead.whatsapp },
    });
  }
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
            : "Chegamos ao limite de conversa por hoje. Se quiser continuar agora, chame no WhatsApp +55 11 98550-3734 — respondemos por lá.",
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

    // Se o João apurou o lead nesta mensagem, grava. Falha não interrompe a
    // conversa — ver comentário em gravarLead.
    if (resultado.lead) {
      await gravarLead(resultado.lead, mensagens);
    }

    // O campo "lead" é interno: o navegador não precisa dele, e devolvê-lo
    // exporia dados no console de quem abrir as ferramentas de desenvolvedor.
    const { lead: _lead, ...paraOCliente } = resultado;
    return NextResponse.json(paraOCliente);
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
