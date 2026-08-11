import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";

export interface RespostaAgente {
  texto: string;
  transferirHumano: boolean;
  motivoTransferencia?: string;
}

/**
 * Monta o "conhecimento" do agente a partir do catálogo real da
 * empresa. Isso é o que evita respostas genéricas — o agente só
 * fala sobre produtos que de fato existem no cadastro do cliente.
 */
async function montarContextoCatalogo(empresaId: string): Promise<string> {
  const admin = createAdminClient();

  const { data: produtos } = await admin
    .from("produtos")
    .select("nome, categoria, preco_venda, descricao")
    .eq("empresa_id", empresaId)
    .eq("ativo_catalogo", true)
    .order("categoria");

  if (!produtos || produtos.length === 0) {
    return "Nenhum produto cadastrado no catálogo ainda.";
  }

  const porCategoria = new Map<string, typeof produtos>();
  for (const p of produtos) {
    const cat = p.categoria ?? "Outros";
    if (!porCategoria.has(cat)) porCategoria.set(cat, []);
    porCategoria.get(cat)!.push(p);
  }

  let texto = "";
  for (const [categoria, itens] of porCategoria) {
    texto += `\n## ${categoria}\n`;
    for (const item of itens) {
      texto += `- ${item.nome}: R$ ${Number(item.preco_venda).toFixed(2)}`;
      if (item.descricao) texto += ` — ${item.descricao}`;
      texto += "\n";
    }
  }

  return texto;
}

function pareceNecessitarHumano(
  mensagemCliente: string,
  gatilhos: string[]
): string | null {
  const normalizado = mensagemCliente.toLowerCase();
  for (const gatilho of gatilhos) {
    if (normalizado.includes(gatilho.toLowerCase())) {
      return gatilho;
    }
  }
  return null;
}

export async function gerarRespostaAgente(params: {
  empresaId: string;
  empresaNome: string;
  historico: { remetente: string; conteudo: string }[];
  mensagemAtual: string;
  configComercial: {
    nome_atendente: string;
    instrucoes_extras: string | null;
    gatilhos_transferencia: string[];
  };
}): Promise<RespostaAgente> {
  // Checagem determinística primeiro — mais rápida e mais confiável
  // que depender da IA para reconhecer gatilhos críticos.
  const gatilhoAcionado = pareceNecessitarHumano(
    params.mensagemAtual,
    params.configComercial.gatilhos_transferencia
  );

  if (gatilhoAcionado) {
    return {
      texto:
        "Entendi. Vou te transferir para alguém da nossa equipe que pode te ajudar melhor com isso — um momento, por favor.",
      transferirHumano: true,
      motivoTransferencia: `Gatilho: "${gatilhoAcionado}"`,
    };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      texto:
        "No momento não consigo responder automaticamente. Já chamei alguém da equipe para te atender.",
      transferirHumano: true,
      motivoTransferencia: "Chave da IA não configurada",
    };
  }

  const catalogo = await montarContextoCatalogo(params.empresaId);
  const client = new Anthropic({ apiKey });

  const systemPrompt = `Você é ${params.configComercial.nome_atendente}, atendente virtual do WhatsApp de "${params.empresaNome}", um restaurante.

Seu papel: responder dúvidas, apresentar o cardápio, recomendar produtos e ajudar o cliente a decidir o pedido. Você NÃO fecha pedidos nem processa pagamentos — apenas orienta e encaminha.

CARDÁPIO ATUAL (só fale sobre o que está aqui — nunca invente produto ou preço):
${catalogo}

${params.configComercial.instrucoes_extras ? `INSTRUÇÕES ESPECÍFICAS DESTE RESTAURANTE:\n${params.configComercial.instrucoes_extras}\n` : ""}

REGRAS:
- Respostas curtas, diretas, tom caloroso — é WhatsApp, não e-mail.
- Se não souber responder algo com segurança, diga que vai verificar com a equipe, nunca invente.
- Nunca informe preço de algo que não está no cardápio acima.
- Não negocie descontos nem prometa prazos que você não tem como garantir.`;

  const mensagens = [
    ...params.historico.map((m) => ({
      role: (m.remetente === "cliente" ? "user" : "assistant") as
        | "user"
        | "assistant",
      content: m.conteudo,
    })),
    { role: "user" as const, content: params.mensagemAtual },
  ];

  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 500,
      system: systemPrompt,
      messages: mensagens,
    });

    const textBlock = response.content.find((b) => b.type === "text");
    const texto =
      textBlock?.type === "text"
        ? textBlock.text
        : "Desculpe, não consegui processar sua mensagem. Vou chamar alguém da equipe.";

    return { texto, transferirHumano: false };
  } catch {
    return {
      texto:
        "Estou com uma instabilidade no momento. Já chamei alguém da equipe para continuar seu atendimento.",
      transferirHumano: true,
      motivoTransferencia: "Falha na chamada à IA",
    };
  }
}
