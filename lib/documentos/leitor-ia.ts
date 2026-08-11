import Anthropic from "@anthropic-ai/sdk";
import type { NotaExtraida } from "./xml-nfe";

const PROMPT_EXTRACAO = `Você está lendo uma nota fiscal, cupom de compra ou recibo de um pequeno restaurante brasileiro.

Extraia os dados no formato JSON abaixo. Se um campo não existir no documento, use null.
Para os itens, extraia CADA linha de produto separadamente, exatamente como está escrito.

Responda APENAS com o JSON, sem texto antes ou depois, sem markdown, sem \`\`\`json.

{
  "fornecedorNome": string | null,
  "fornecedorCnpj": string | null,
  "numeroNota": string | null,
  "dataEmissao": "YYYY-MM-DD" | null,
  "valorTotal": number | null,
  "itens": [
    {
      "descricao": string,
      "quantidade": number,
      "unidade": string | null,
      "valorUnitario": number,
      "valorTotal": number
    }
  ]
}

Regras importantes:
- Números sempre com ponto decimal, nunca vírgula (ex.: 12.5, não 12,5)
- Se a quantidade não estiver explícita, calcule: valorTotal / valorUnitario
- Nunca invente itens que não estão no documento
- Se o documento estiver ilegível ou não for um documento de compra, retorne itens: []`;

/**
 * Lê PDF ou foto de documento usando visão da IA. É a rede de
 * segurança para quando o cliente não tem o XML da NF-e — precisão
 * menor que a leitura direta (~90%), por isso o resultado SEMPRE
 * passa por confirmação humana antes de ser lançado no sistema.
 */
export async function lerDocumentoComIA(params: {
  base64: string;
  mediaType: "application/pdf" | "image/jpeg" | "image/png" | "image/webp";
}): Promise<NotaExtraida> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Leitura por IA indisponível: chave da Anthropic não configurada. " +
        "Envie o XML da nota, que não depende de IA, ou configure a chave em .env.local."
    );
  }

  const client = new Anthropic({ apiKey });

  const contentBlock =
    params.mediaType === "application/pdf"
      ? {
          type: "document" as const,
          source: {
            type: "base64" as const,
            media_type: params.mediaType,
            data: params.base64,
          },
        }
      : {
          type: "image" as const,
          source: {
            type: "base64" as const,
            media_type: params.mediaType,
            data: params.base64,
          },
        };

  const response = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: [contentBlock, { type: "text", text: PROMPT_EXTRACAO }],
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("A IA não retornou texto legível para este documento.");
  }

  let parsed: any;
  try {
    // Remove eventuais cercas de código, mesmo com a instrução de não usar
    const limpo = textBlock.text.replace(/```json|```/g, "").trim();
    parsed = JSON.parse(limpo);
  } catch {
    throw new Error(
      "Não foi possível interpretar a resposta da IA para este documento. Tente novamente ou envie o XML da nota."
    );
  }

  return {
    fornecedorNome: parsed.fornecedorNome ?? null,
    fornecedorCnpj: parsed.fornecedorCnpj ?? null,
    numeroNota: parsed.numeroNota ?? null,
    dataEmissao: parsed.dataEmissao ?? null,
    valorTotal: parsed.valorTotal ?? null,
    itens: Array.isArray(parsed.itens)
      ? parsed.itens.map((i: any) => ({
          descricao: String(i.descricao ?? "").trim(),
          quantidade: Number(i.quantidade ?? 0),
          unidade: i.unidade ? String(i.unidade).trim() : null,
          valorUnitario: Number(i.valorUnitario ?? 0),
          valorTotal: Number(i.valorTotal ?? 0),
        }))
      : [],
  };
}
