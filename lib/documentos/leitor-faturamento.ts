import Anthropic from "@anthropic-ai/sdk";

export type ItemFaturamento = {
  data: string; // AAAA-MM-DD
  valor: number;
  atendimentos: number | null;
  canal: string | null;
};

export type LeituraFaturamento = {
  itens: ItemFaturamento[];
  periodo_inicio: string | null;
  periodo_fim: string | null;
  total_declarado: number | null;
  observacao: string | null;
};

const SYSTEM = `Você lê relatórios de venda de restaurantes e extrai o faturamento.

Regras absolutas:
- Extraia SOMENTE o que está escrito. Nunca calcule médias, nunca distribua um total entre dias, nunca invente data.
- Se o relatório só traz um total do período, devolva itens vazio e preencha total_declarado com esse total.
- Se traz venda por dia, devolva um item por dia com a data exata.
- Valores em formato brasileiro (1.234,56) devem virar número (1234.56).
- Datas sempre AAAA-MM-DD. Se o ano não aparecer no documento, use o ano informado pelo usuário na mensagem.
- Se houver dúvida entre faturamento bruto e líquido, prefira o bruto e diga isso em observacao.
- Se o documento não for um relatório de vendas, devolva tudo vazio e explique em observacao.

Responda APENAS com JSON, sem markdown:
{"itens":[{"data":"2026-08-01","valor":1234.56,"atendimentos":42,"canal":"salão"}],"periodo_inicio":"2026-08-01","periodo_fim":"2026-08-31","total_declarado":86436.81,"observacao":null}

Use null quando não souber. atendimentos e canal são null se o documento não trouxer.`;

export async function lerDocumentoFaturamento(params: {
  base64: string;
  mediaType: "application/pdf" | "image/jpeg" | "image/png" | "image/webp";
  anoReferencia: number;
  descricao?: string | null;
}): Promise<LeituraFaturamento> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Chave da Anthropic não configurada.");

  const client = new Anthropic({ apiKey });

  const bloco =
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

  const contexto = [
    `O ano de referência é ${params.anoReferencia}, use-o se o documento omitir o ano.`,
    params.descricao ? `O usuário descreveu assim: "${params.descricao}".` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const resposta = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 3000,
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: [bloco, { type: "text", text: contexto }],
      },
      // Prefill: obriga o modelo a começar dentro do JSON.
      { role: "assistant", content: "{" },
    ],
  });

  const texto = resposta.content.find((b) => b.type === "text");
  if (!texto || texto.type !== "text") {
    throw new Error("Não consegui ler o documento.");
  }

  const bruto = "{" + texto.text;
  const inicio = bruto.indexOf("{");
  const fim = bruto.lastIndexOf("}");

  let dados: any;
  try {
    dados = JSON.parse(bruto.slice(inicio, fim + 1));
  } catch {
    throw new Error("A leitura veio em formato inesperado. Tente outro arquivo.");
  }

  const itens: ItemFaturamento[] = Array.isArray(dados.itens)
    ? dados.itens
        .filter(
          (i: any) =>
            typeof i?.data === "string" &&
            /^\d{4}-\d{2}-\d{2}$/.test(i.data) &&
            Number.isFinite(Number(i?.valor))
        )
        .map((i: any) => ({
          data: i.data,
          valor: Number(i.valor),
          atendimentos: Number.isFinite(Number(i?.atendimentos))
            ? Number(i.atendimentos)
            : null,
          canal: typeof i?.canal === "string" ? i.canal.slice(0, 40) : null,
        }))
    : [];

  return {
    itens,
    periodo_inicio: dados.periodo_inicio ?? null,
    periodo_fim: dados.periodo_fim ?? null,
    total_declarado: Number.isFinite(Number(dados.total_declarado))
      ? Number(dados.total_declarado)
      : null,
    observacao:
      typeof dados.observacao === "string" ? dados.observacao : null,
  };
}
