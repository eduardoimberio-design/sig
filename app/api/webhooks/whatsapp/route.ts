import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { extrairMensagensDoWebhook, enviarMensagemTexto } from "@/lib/dialog360";
import { gerarRespostaAgente } from "@/lib/whatsapp-agent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * IMPORTANTE: este é um endpoint multi-tenant — várias empresas
 * clientes do SIG compartilham este mesmo webhook. Cada número de
 * WhatsApp conectado (Channel ID) identifica a empresa dona da
 * conversa. Isso é resolvido via `empresas.whatsapp_channel_id`.
 */
export async function POST(req: NextRequest) {
  const payload = await req.json().catch(() => null);
  if (!payload) return NextResponse.json({ ok: true });

  const admin = createAdminClient();

  // O Channel ID identifica de qual número (e portanto de qual
  // empresa) a mensagem chegou.
  const channelId: string | undefined =
    payload?.entry?.[0]?.id ?? payload?.channel_id;

  if (!channelId) {
    return NextResponse.json({ ok: true }); // evento sem mensagem relevante
  }

  const { data: empresa } = await admin
    .from("empresas")
    .select("id, nome")
    .eq("whatsapp_channel_id", channelId)
    .maybeSingle();

  if (!empresa) {
    // Canal não reconhecido — não é erro do cliente, apenas
    // ignoramos silenciosamente para não vazar informação.
    return NextResponse.json({ ok: true });
  }

  const { data: config } = await admin
    .from("config_comercial")
    .select("*")
    .eq("empresa_id", empresa.id)
    .maybeSingle();

  if (!config?.ativo) {
    return NextResponse.json({ ok: true }); // agente desligado por essa empresa
  }

  const mensagensRecebidas = extrairMensagensDoWebhook(payload);

  for (const msg of mensagensRecebidas) {
    // Encontra ou cria a conversa deste contato
    let { data: conversa } = await admin
      .from("conversas_whatsapp")
      .select("id, status, atribuida_humano")
      .eq("empresa_id", empresa.id)
      .eq("contato_telefone", msg.telefone)
      .eq("status", "aberta")
      .maybeSingle();

    if (!conversa) {
      const { data: novaConversa } = await admin
        .from("conversas_whatsapp")
        .insert({
          empresa_id: empresa.id,
          contato_telefone: msg.telefone,
          contato_nome: msg.nomeContato,
          status: "aberta",
        })
        .select("id, status, atribuida_humano")
        .single();
      conversa = novaConversa;
    }

    if (!conversa) continue;

    // Salva a mensagem do cliente
    await admin.from("mensagens_whatsapp").insert({
      conversa_id: conversa.id,
      empresa_id: empresa.id,
      remetente: "cliente",
      conteudo: msg.texto,
    });

    // Se já foi transferida para humano, o agente não responde mais
    // — evita a IA "brigar" com o atendente por cima da conversa.
    if (conversa.atribuida_humano) continue;

    const { data: historico } = await admin
      .from("mensagens_whatsapp")
      .select("remetente, conteudo")
      .eq("conversa_id", conversa.id)
      .order("created_at", { ascending: true })
      .limit(20);

    const resposta = await gerarRespostaAgente({
      empresaId: empresa.id,
      empresaNome: empresa.nome,
      historico: (historico ?? []).slice(0, -1), // exclui a msg atual, já enviada separadamente
      mensagemAtual: msg.texto,
      configComercial: {
        nome_atendente: config.nome_atendente,
        instrucoes_extras: config.instrucoes_extras,
        gatilhos_transferencia: config.gatilhos_transferencia ?? [],
      },
    });

    await admin.from("mensagens_whatsapp").insert({
      conversa_id: conversa.id,
      empresa_id: empresa.id,
      remetente: "agente_ia",
      conteudo: resposta.texto,
    });

    if (resposta.transferirHumano) {
      await admin
        .from("conversas_whatsapp")
        .update({ atribuida_humano: true, status: "transferida_humano" })
        .eq("id", conversa.id);
    }

    // Envia de volta pelo WhatsApp. Isolado em try/catch: se o envio
    // falhar, a mensagem já está salva no histórico — o atendente
    // consegue ver e responder manualmente pelo painel.
    try {
      await enviarMensagemTexto({
        telefone: msg.telefone,
        texto: resposta.texto,
      });
    } catch (e) {
      console.error("[SIG] Falha ao enviar resposta WhatsApp:", e);
    }
  }

  return NextResponse.json({ ok: true });
}

// A 360dialog (via Meta) faz uma verificação GET na configuração
// inicial do webhook, ecoando um "challenge".
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const challenge = params.get("hub.challenge");
  const token = params.get("hub.verify_token");

  if (token === process.env.WHATSAPP_WEBHOOK_SECRET && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ erro: "Token inválido" }, { status: 403 });
}
