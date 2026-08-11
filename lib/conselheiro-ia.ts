import Anthropic from "@anthropic-ai/sdk";
import { montarContextoNegocio } from "./conselheiro-contexto";

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Chave da Anthropic não configurada. Configure ANTHROPIC_API_KEY no .env.local."
    );
  }
  return new Anthropic({ apiKey });
}

function extrairJSON(texto: string): any {
  const limpo = texto.replace(/```json|```/g, "").trim();
  try {
    return JSON.parse(limpo);
  } catch {
    throw new Error("Não foi possível interpretar a resposta da IA.");
  }
}

// ---------------------------------------------------------
// ISHIKAWA
// ---------------------------------------------------------
export interface CausaIshikawa {
  categoria: string;
  descricao: string;
  principal: boolean;
}

const CATEGORIAS_ISHIKAWA = [
  "metodo",
  "mao_de_obra",
  "maquina",
  "material",
  "meio_ambiente",
  "medicao",
] as const;

export async function gerarIshikawa(
  empresaId: string,
  problema: string
): Promise<CausaIshikawa[]> {
  const client = getClient();
  const contexto = await montarContextoNegocio(empresaId);

  const response = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 1500,
    system: `Você ajuda a montar um diagrama de Ishikawa (espinha de peixe) para diagnosticar problemas operacionais de um pequeno restaurante no Brasil.

Gere causas possíveis nas 6 categorias clássicas: metodo (processo/procedimento), mao_de_obra (pessoas/treinamento), maquina (equipamentos), material (insumos/fornecedores), meio_ambiente (ambiente físico/clima), medicao (falta de controle/indicador).

Use o contexto real do negócio quando fizer sentido, mas também aplique conhecimento geral de operação de food service para causas que os dados não cobrem — o cliente vai revisar e editar tudo antes de decidir.

Entre 2 e 4 causas por categoria, curtas e específicas (nunca genéricas tipo "falta de organização").

Responda APENAS com JSON, sem texto antes ou depois, sem markdown:
{ "causas": [{"categoria": "metodo", "descricao": "..."}] }`,
    messages: [
      {
        role: "user",
        content: `Contexto do negócio:\n${contexto}\n\nProblema descrito pelo cliente: ${problema}`,
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("A IA não retornou causas legíveis.");
  }

  const parsed = extrairJSON(textBlock.text);
  const causas = Array.isArray(parsed.causas) ? parsed.causas : [];

  return causas
    .filter((c: any) => CATEGORIAS_ISHIKAWA.includes(c.categoria))
    .map((c: any) => ({
      categoria: c.categoria,
      descricao: String(c.descricao ?? ""),
      principal: false,
    }));
}

// ---------------------------------------------------------
// 5 PORQUÊS
// ---------------------------------------------------------
export interface NivelPorque {
  pergunta: string;
  resposta: string;
}

export async function gerarCincoPorques(
  causaOrigem: string
): Promise<NivelPorque[]> {
  const client = getClient();

  const response = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 1200,
    system: `Você conduz a técnica dos "5 Porquês" para chegar à causa raiz de um problema de restaurante.

Comece da causa fornecida e pergunte "por que isso acontece?" repetidamente, 5 vezes, cada resposta ficando mais fundamental que a anterior. As respostas são SUGESTÕES para o cliente confirmar ou corrigir — ele conhece a operação real, você não.

Responda APENAS com JSON, sem texto antes ou depois, sem markdown:
{ "niveis": [{"pergunta": "Por que...?", "resposta": "sugestão de resposta"}] }
Exatamente 5 níveis.`,
    messages: [{ role: "user", content: `Causa a investigar: ${causaOrigem}` }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("A IA não retornou os 5 porquês.");
  }

  const parsed = extrairJSON(textBlock.text);
  return Array.isArray(parsed.niveis) ? parsed.niveis.slice(0, 5) : [];
}

// ---------------------------------------------------------
// 5W2H
// ---------------------------------------------------------
export interface AcaoPlano {
  o_que: string;
  por_que: string;
  onde: string;
  quando: string;
  quem: string;
  como: string;
  quanto_custa: string;
  status: "pendente";
}

export async function gerarPlano5W2H(
  empresaId: string,
  causaRaiz: string
): Promise<AcaoPlano[]> {
  const client = getClient();
  const contexto = await montarContextoNegocio(empresaId);

  const response = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 1500,
    system: `Você monta um plano de ação usando 5W2H (O quê, Por quê, Onde, Quando, Quem, Como, Quanto custa) para resolver a causa raiz de um problema de restaurante.

Use o contexto do negócio para sugerir responsável real (nome/função da equipe) quando fizer sentido. Para "quanto custa", dê uma estimativa realista em reais ou escreva "sem custo direto" — nunca invente um número preciso sem base.

Gere entre 1 e 3 ações concretas, específicas, executáveis por um pequeno restaurante — nunca genéricas.

Responda APENAS com JSON, sem texto antes ou depois, sem markdown:
{ "acoes": [{"o_que": "...", "por_que": "...", "onde": "...", "quando": "...", "quem": "...", "como": "...", "quanto_custa": "..."}] }`,
    messages: [
      {
        role: "user",
        content: `Contexto do negócio:\n${contexto}\n\nCausa raiz a resolver: ${causaRaiz}`,
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("A IA não retornou o plano de ação.");
  }

  const parsed = extrairJSON(textBlock.text);
  const acoes = Array.isArray(parsed.acoes) ? parsed.acoes : [];

  return acoes.map((a: any) => ({
    o_que: String(a.o_que ?? ""),
    por_que: String(a.por_que ?? ""),
    onde: String(a.onde ?? ""),
    quando: String(a.quando ?? ""),
    quem: String(a.quem ?? ""),
    como: String(a.como ?? ""),
    quanto_custa: String(a.quanto_custa ?? ""),
    status: "pendente" as const,
  }));
}

// ---------------------------------------------------------
// SWOT
// ---------------------------------------------------------
export interface AnaliseSwot {
  forcas: string[];
  fraquezas: string[];
  oportunidades: string[];
  ameacas: string[];
}

export async function gerarSwot(
  empresaId: string,
  questaoEstrategica: string
): Promise<AnaliseSwot> {
  const client = getClient();
  const contexto = await montarContextoNegocio(empresaId);

  const response = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 1500,
    system: `Você monta uma análise SWOT para apoiar uma decisão estratégica de um pequeno restaurante no Brasil.

Forças e Fraquezas: baseie-se nos dados reais fornecidos (CMV, margem, equipe, equipamentos) — não invente números que não estão lá.
Oportunidades e Ameaças: use conhecimento geral de mercado de food service no Brasil, já que isso não vem dos dados internos do restaurante.

Entre 2 e 4 itens por quadrante, curtos e específicos.

Responda APENAS com JSON, sem texto antes ou depois, sem markdown:
{ "forcas": ["..."], "fraquezas": ["..."], "oportunidades": ["..."], "ameacas": ["..."] }`,
    messages: [
      {
        role: "user",
        content: `Contexto do negócio:\n${contexto}\n\nQuestão estratégica: ${questaoEstrategica}`,
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("A IA não retornou a análise SWOT.");
  }

  const parsed = extrairJSON(textBlock.text);
  return {
    forcas: Array.isArray(parsed.forcas) ? parsed.forcas : [],
    fraquezas: Array.isArray(parsed.fraquezas) ? parsed.fraquezas : [],
    oportunidades: Array.isArray(parsed.oportunidades) ? parsed.oportunidades : [],
    ameacas: Array.isArray(parsed.ameacas) ? parsed.ameacas : [],
  };
}
