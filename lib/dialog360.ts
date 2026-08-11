const BASE_URL = "https://waba-v2.360dialog.io";

function getApiKey(): string {
  const key = process.env.DIALOG360_API_KEY;
  if (!key) throw new Error("DIALOG360_API_KEY não configurada.");
  return key;
}

/**
 * Envia uma mensagem de texto simples via WhatsApp.
 * Só funciona dentro da janela de 24h após a última mensagem do
 * cliente (mensagem de "serviço", gratuita). Fora dessa janela,
 * a Meta exige um template pré-aprovado — não coberto no MVP.
 */
export async function enviarMensagemTexto(params: {
  telefone: string; // formato internacional, ex.: 5511999998888
  texto: string;
}): Promise<{ id: string }> {
  const res = await fetch(`${BASE_URL}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "D360-API-KEY": getApiKey(),
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: params.telefone,
      type: "text",
      text: { body: params.texto },
    }),
  });

  if (!res.ok) {
    const texto = await res.text();
    throw new Error(`360dialog: falha ao enviar mensagem (${res.status}) ${texto}`);
  }

  const data = await res.json();
  return { id: data.messages?.[0]?.id ?? "" };
}

/**
 * Formato do payload recebido no webhook da 360dialog (compatível
 * com o formato oficial da Meta Cloud API, que a 360dialog repassa).
 */
export interface WebhookMensagemRecebida {
  telefone: string;
  nomeContato: string | null;
  texto: string;
  messageId: string;
}

export function extrairMensagensDoWebhook(
  payload: any
): WebhookMensagemRecebida[] {
  const mensagens: WebhookMensagemRecebida[] = [];

  const entradas = payload?.entry ?? [];
  for (const entrada of entradas) {
    const mudancas = entrada?.changes ?? [];
    for (const mudanca of mudancas) {
      const valor = mudanca?.value;
      const contatos = valor?.contacts ?? [];
      const msgs = valor?.messages ?? [];

      for (const msg of msgs) {
        if (msg.type !== "text") continue; // MVP: só texto

        const contato = contatos.find((c: any) => c.wa_id === msg.from);

        mensagens.push({
          telefone: msg.from,
          nomeContato: contato?.profile?.name ?? null,
          texto: msg.text?.body ?? "",
          messageId: msg.id,
        });
      }
    }
  }

  return mensagens;
}
