import Anthropic from "@anthropic-ai/sdk";

export type ModuloAnexo =
  | "financeiro"
  | "estoque"
  | "marketing"
  | "equipe"
  | "conselheiro";

/**
 * Orientação de leitura por agente. Não muda o que a IA pode
 * inventar (ela não pode) — só diz onde prestar atenção, para o
 * resumo sair útil para aquele agente específico.
 */
const FOCO_POR_MODULO: Record<ModuloAnexo, string> = {
  financeiro:
    "Este arquivo interessa ao agente Financeiro. Priorize valores, datas, " +
    "descrições de lançamento, formas de pagamento, saldos e vencimentos.",
  estoque:
    "Este arquivo interessa ao agente de Estoque. Priorize nomes de insumos, " +
    "quantidades, unidades, preços de compra, fornecedores e validades.",
  marketing:
    "Este arquivo interessa ao agente de Marketing. Se for um print de painel " +
    "de rede social, extraia cada métrica com o nome exato como aparece na tela " +
    "(alcance, seguidores, visualizações, interações, período). Se for um " +
    "material de campanha, descreva o que está sendo comunicado.",
  equipe:
    "Este arquivo interessa ao agente de Equipe. Priorize nomes, funções, " +
    "turnos, datas, faltas, horários e o que o documento formaliza.",
  conselheiro:
    "Este arquivo é evidência de um problema ou de uma decisão. Se for print " +
    "de conversa, identifique quem falou o quê e qual é o ponto de conflito ou " +
    "combinado. Relate os fatos sem opinar sobre quem tem razão.",
};

const REGRAS = `
Regras que valem sempre:
- Relate SOMENTE o que está visível no arquivo. Nunca complete, estime ou deduza.
- Copie números exatamente como aparecem, sem arredondar nem converter.
- Se algo estiver ilegível ou cortado, escreva que está ilegível em vez de chutar.
- Se o arquivo não tiver nada de útil, diga isso com franqueza.
- Escreva em português do Brasil, em texto corrido curto, no máximo 12 linhas.
- Não dê conselhos nem análise. Sua função aqui é só relatar o conteúdo.
- Não use markdown, títulos nem listas numeradas.`;

/**
 * Lê um anexo e devolve um resumo factual em texto. Esse resumo é o
 * que os agentes vão consumir depois — o arquivo bruto nunca vai
 * para o raciocínio deles. Precisão de leitura por visão não é
 * 100%, por isso o resumo passa por confirmação do cliente antes
 * de valer como informação do negócio.
 */
export async function lerAnexoContexto(params: {
  base64: string;
  mediaType: "application/pdf" | "image/jpeg" | "image/png" | "image/webp";
  modulo: ModuloAnexo;
  descricao?: string | null;
}): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Leitura indisponível: chave da Anthropic não configurada. " +
        "O arquivo foi guardado, mas sem leitura automática."
    );
  }

  const client = new Anthropic({ apiKey });

  const contexto = params.descricao
    ? `O cliente descreveu este arquivo assim: "${params.descricao}". ` +
      `Use isso para se orientar, mas relate o que você realmente vê.`
    : "";

  const prompt = [
    "Você está lendo um arquivo enviado pelo dono de um pequeno negócio de alimentação no Brasil.",
    FOCO_POR_MODULO[params.modulo],
    contexto,
    REGRAS,
  ]
    .filter(Boolean)
    .join("\n\n");

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

  const resposta = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 1200,
    messages: [
      {
        role: "user",
        content: [bloco, { type: "text", text: prompt }],
      },
    ],
  });

  const texto = resposta.content.find((b) => b.type === "text");
  if (!texto || texto.type !== "text" || !texto.text.trim()) {
    throw new Error("A IA não conseguiu ler este arquivo. Tente outro formato.");
  }

  return texto.text.trim();
}
