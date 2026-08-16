import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import { montarContextoAnexos } from "@/lib/anexos-contexto";

export interface SlideCarrossel {
  titulo: string;
  texto: string;
}

export interface ConteudoGerado {
  titulo: string;
  legenda: string;
  hashtags: string[];
  slides: SlideCarrossel[] | null;
}

const SYSTEM_PROMPT = `Você cria conteúdo para Instagram de pequenos restaurantes no Brasil.

Estilo obrigatório:
- Tom autêntico, primeira pessoa do estabelecimento — nunca linguagem de agência genérica.
- Concreto e específico: use os produtos e preços reais fornecidos, nunca invente prato.
- Evite clichê de coach ("transforme sua experiência", "viva um momento único") — fale como o dono do restaurante falaria de verdade.
- Legendas de post/story: curtas, com um CTA claro no fim (ex.: "Chama no WhatsApp", "Peça já").
- Carrossel: cada slide é uma ideia só, texto curto o suficiente para ler em 2 segundos.

Responda APENAS com JSON, sem texto antes ou depois, sem markdown, sem \`\`\`json:

{
  "titulo": "título interno curto, para identificar este conteúdo na lista",
  "legenda": "texto pronto para colar na legenda do Instagram",
  "hashtags": ["#exemplo1", "#exemplo2"],
  "slides": [{"titulo": "...", "texto": "..."}] ou null se não for carrossel
}`;

export async function gerarConteudoMarketing(params: {
  empresaId: string;
  empresaNome: string;
  tipo: "post" | "carrossel" | "story" | "campanha";
  tema: string;
  configMarketing: {
    tom_voz: string;
    publico_alvo: string | null;
    diferenciais: string | null;
  };
}): Promise<ConteudoGerado> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Chave da Anthropic não configurada. Configure ANTHROPIC_API_KEY no .env.local."
    );
  }

  const admin = createAdminClient();
  const { data: produtos } = await admin
    .from("produtos")
    .select("nome, categoria, preco_venda, descricao")
    .eq("empresa_id", params.empresaId)
    .eq("ativo_catalogo", true)
    .order("categoria");

  const catalogoTexto =
    produtos && produtos.length > 0
      ? produtos
          .map(
            (p) =>
              `- ${p.nome} (${p.categoria ?? "sem categoria"}): R$ ${Number(p.preco_venda).toFixed(2)}${p.descricao ? ` — ${p.descricao}` : ""}`
          )
          .join("\n")
      : "Nenhum produto cadastrado ainda — crie um conteúdo genérico sobre o restaurante, sem citar prato específico.";

  const anexos = await montarContextoAnexos(params.empresaId, "marketing");

  const client = new Anthropic({ apiKey });

  const userPrompt = `Restaurante: ${params.empresaNome}
Tom de voz: ${params.configMarketing.tom_voz}
${params.configMarketing.publico_alvo ? `Público-alvo: ${params.configMarketing.publico_alvo}` : ""}
${params.configMarketing.diferenciais ? `Diferenciais a destacar quando fizer sentido: ${params.configMarketing.diferenciais}` : ""}

Cardápio disponível:
${catalogoTexto}

Tipo de conteúdo solicitado: ${params.tipo}
Tema/ocasião: ${params.tema}

${anexos ? `\n${anexos}\n` : ""}
${params.tipo === "carrossel" ? "Gere entre 4 e 6 slides." : "Gere slides: null."}`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 1500,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("A IA não retornou conteúdo legível.");
  }

  let parsed: any;
  try {
    const limpo = textBlock.text.replace(/```json|```/g, "").trim();
    parsed = JSON.parse(limpo);
  } catch {
    throw new Error("Não foi possível interpretar a resposta da IA.");
  }

  return {
    titulo: String(parsed.titulo ?? params.tema),
    legenda: String(parsed.legenda ?? ""),
    hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags : [],
    slides: Array.isArray(parsed.slides) ? parsed.slides : null,
  };
}
