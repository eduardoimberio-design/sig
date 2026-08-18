import Anthropic from "@anthropic-ai/sdk";

export type LinhaContagem = {
  origem: string;
  tipo: string;
  severidade: string;
  ocorrencias: number;
  empresas_afetadas: number;
  exemplo: string | null;
  ultima_em: string;
};

const NOME_AMIGAVEL: Record<string, string> = {
  joao: "João (agente guia)",
  anexos: "Envio de documentos aos agentes",
  consultor: "Consultor IA",
  conselheiro: "Conselheiro",
  marketing: "Agente de Marketing",
  documentos: "Leitura de notas no Estoque",
  pagamento: "Cobrança e pagamento",
  suporte: "Chat de suporte",
};

const SYSTEM = `Você é o Sentinela, o vigia técnico do SIG — uma plataforma de gestão para pequenos negócios de alimentação.

Quem lê o seu relatório é o Eduardo, dono do SIG. Ele não é programador. Escreva para alguém que precisa decidir o que resolver primeiro, não para alguém que vai depurar código.

Regras que não se quebram:
- Os números vêm prontos. Use exatamente os que estão na tabela. Nunca some, estime ou arredonde por conta própria, e nunca cite um número que não esteja ali.
- Se não houver falha nenhuma, diga isso em uma linha e pare. Não invente preocupação para parecer útil.
- Distinga o que atinge cliente pagante do que é irrelevante. Uma falha de cobrança é grave mesmo com uma ocorrência; um visitante anônimo batendo no limite do João é normal e não merece alarme.
- Quando a causa não for dedutível dos dados, diga que não dá para saber pelo registro e sugira o que olhar. Não invente diagnóstico.
- Nunca sugira que ele mexa em código sozinho.

Formato: português do Brasil, texto corrido, no máximo 12 linhas. Sem markdown, sem títulos, sem lista numerada. Comece pelo que é mais urgente. Se nada for urgente, comece dizendo que o dia foi tranquilo.`;

export async function gerarResumoSentinela(params: {
  linhas: LinhaContagem[];
  referencia: string;
}): Promise<string> {
  if (params.linhas.length === 0) {
    // Sem falha nenhuma não vale gastar chamada de IA.
    return "Nenhuma falha registrada nas últimas 24 horas. Sistema operando normalmente.";
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Chave da Anthropic não configurada.");

  const client = new Anthropic({ apiKey });

  const tabela = params.linhas
    .map(
      (l) =>
        `- ${NOME_AMIGAVEL[l.origem] ?? l.origem} | tipo: ${l.tipo} | ` +
        `gravidade: ${l.severidade} | ocorrências: ${l.ocorrencias} | ` +
        `empresas afetadas: ${l.empresas_afetadas} | ` +
        `última: ${new Date(l.ultima_em).toLocaleString("pt-BR")} | ` +
        `exemplo da mensagem: ${l.exemplo ?? "sem detalhe"}`
    )
    .join("\n");

  const resposta = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 900,
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content:
          `Falhas registradas em ${params.referencia} (últimas 24 horas):\n\n${tabela}\n\n` +
          `Escreva o relatório do dia.`,
      },
    ],
  });

  const bloco = resposta.content.find((b) => b.type === "text");
  if (!bloco || bloco.type !== "text") {
    throw new Error("Sentinela não conseguiu escrever o resumo.");
  }

  return bloco.text.trim();
}
