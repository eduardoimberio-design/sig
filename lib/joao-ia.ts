import Anthropic from "@anthropic-ai/sdk";
import { MAPA_SISTEMA, SOBRE_O_SIG } from "./joao-mapa";

// Modelo leve de propósito: o João dá respostas curtas de orientação
// e atende também visitante anônimo, então volume importa mais que
// profundidade. Se um dia precisar trocar, é só aqui.
const MODELO = "claude-haiku-4-5-20251001";

export type MensagemJoao = { role: "user" | "assistant"; content: string };

export type RespostaJoao = {
  resposta: string;
  atalhos: { rotulo: string; url: string }[];
};

const PERSONA = `Você é o João, o anfitrião do SIG. Sua função é receber a pessoa, explicar onde fica cada coisa e como usar.

Como você fala:
- Português do Brasil, direto e cordial, sem formalidade empolada.
- Respostas curtas: 2 a 5 frases. Quem pergunta onde fica algo não quer um manual.
- Sem emoji, sem exclamação em excesso, sem "olá, tudo bem?" a cada resposta.
- Trate a pessoa por você. Não invente o nome dela.

Quem você é:
- Você é um assistente do sistema, não uma pessoa. Se perguntarem, diga isso com naturalidade — nunca finja ser humano.

Seus limites (respeite todos):
- Você orienta sobre o sistema. Você NÃO analisa o negócio da pessoa, não calcula número, não dá diagnóstico financeiro nem opinião sobre o restaurante dela. Isso é trabalho do Consultor IA, e você indica o caminho até ele.
- Você não tem acesso aos dados do negócio da pessoa. Se perguntarem "quanto eu faturei", explique que quem mostra isso é o agente Financeiro e mande para lá.
- Nunca invente tela, botão ou funcionalidade. Se algo não está no mapa abaixo, diga com franqueza que o sistema não faz isso.
- Assunto que não é sobre usar o sistema — cobrança, problema na conta, dúvida comercial, pedido de consultoria — você encaminha para o contato humano pelo WhatsApp, no link "Falar com o SIG" no topo da tela.
- Se a pessoa insistir num assunto fora do sistema (receita de comida, notícia, conselho pessoal), diga que não é sua função e volte ao que você faz.

Formato da resposta — responda APENAS com JSON, sem markdown e sem texto fora dele:
{"resposta": "sua resposta em texto corrido", "atalhos": [{"rotulo": "Ir para o Financeiro", "url": "/painel/financeiro"}]}

Sobre os atalhos:
- No máximo 2, e só com URLs que existem no mapa. Sem atalho quando não fizer sentido: "atalhos": [].
- O rótulo é curto e começa com verbo.`;

const MODO_PUBLICO = `A pessoa com quem você está falando AINDA NÃO ESTÁ LOGADA — pode ser alguém conhecendo o sistema agora.

Nesse modo:
- Explique o que o SIG faz e para quem serve.
- Pode apresentar os planos listados abaixo e ajudar a escolher, com honestidade: para quem só quer experimentar, o mensal; para quem já decidiu, os períodos longos saem proporcionalmente mais baratos. Nunca pressione.
- Não prometa desconto, teste grátis, reembolso ou prazo que não esteja escrito aqui.
- Os atalhos possíveis neste modo são apenas /cadastro e /login. Nunca mande alguém não logado para uma tela de /painel.
- Se a pessoa quiser falar com alguém do SIG, indique o WhatsApp na tela.`;

const MODO_CLIENTE = `A pessoa já é cliente e está logada. Ela tem acesso a todas as telas do mapa, então pode mandar atalho de /painel à vontade.`;

function getClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("Chave da Anthropic não configurada.");
  }
  return new Anthropic({ apiKey });
}

export async function responderJoao(params: {
  mensagens: MensagemJoao[];
  modo: "publico" | "cliente";
  telaAtual?: string | null;
  planos?: { nome: string; preco: number; dias: number }[];
  empresaNome?: string | null;
}): Promise<RespostaJoao> {
  const client = getClient();

  const planosTexto =
    params.modo === "publico" && params.planos?.length
      ? "\n\nPLANOS DISPONÍVEIS:\n" +
        params.planos
          .map(
            (p) =>
              `- ${p.nome}: R$ ${Number(p.preco).toFixed(2).replace(".", ",")} por ${p.dias} dias`
          )
          .join("\n")
      : "";

  const ondeEsta = params.telaAtual
    ? `\n\nA pessoa está agora na tela: ${params.telaAtual}. Leve isso em conta — se ela perguntar "como faço aqui", é desta tela que ela fala.`
    : "";

  const quem =
    params.modo === "cliente" && params.empresaNome
      ? `\n\nO negócio dela se chama ${params.empresaNome}.`
      : "";

  const system = [
    PERSONA,
    params.modo === "publico" ? MODO_PUBLICO : MODO_CLIENTE,
    SOBRE_O_SIG,
    MAPA_SISTEMA,
    planosTexto,
    ondeEsta,
    quem,
  ]
    .filter(Boolean)
    .join("\n\n");

  const resposta = await client.messages.create({
    model: MODELO,
    max_tokens: 700,
    system,
    messages: [
      ...params.mensagens.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      // Prefill: começamos a resposta pelo modelo, então ele só pode
      // continuar de dentro do JSON. Sem isso ele às vezes escreve a
      // resposta em texto e repete em JSON logo depois.
      { role: "assistant" as const, content: "{" },
    ],
  });

  const bloco = resposta.content.find((b) => b.type === "text");
  if (!bloco || bloco.type !== "text") {
    throw new Error("Sem resposta legível.");
  }

  // O "{" do prefill não volta na resposta — precisa ser recolocado.
  const bruto = "{" + bloco.text;

  try {
    // Recorta do primeiro ao último caractere de objeto, para o caso
    // de vir qualquer sobra fora do JSON.
    const inicio = bruto.indexOf("{");
    const fim = bruto.lastIndexOf("}");
    const limpo =
      inicio >= 0 && fim > inicio ? bruto.slice(inicio, fim + 1) : bruto;

    const parsed = JSON.parse(limpo);

    const atalhos = Array.isArray(parsed.atalhos)
      ? parsed.atalhos
          .filter(
            (a: any) =>
              typeof a?.rotulo === "string" &&
              typeof a?.url === "string" &&
              a.url.startsWith("/") &&
              // Visitante anônimo nunca recebe link de área logada:
              // clicaria, cairia no login e acharia que quebrou.
              (params.modo === "cliente" || !a.url.startsWith("/painel"))
          )
          .slice(0, 2)
      : [];

    return {
      resposta: String(parsed.resposta ?? "").trim(),
      atalhos,
    };
  } catch {
    // Se ainda assim o JSON vier quebrado, entrega o texto limpo de
    // qualquer resto de estrutura, para o cliente nunca ver chaves.
    const semJson = bruto
      .replace(/\{[\s\S]*?"resposta"\s*:\s*"/, "")
      .replace(/"\s*,\s*"atalhos"[\s\S]*$/, "")
      .replace(/[{}]/g, "")
      .trim();

    return {
      resposta: semJson || "Não consegui formular a resposta. Pergunte de novo?",
      atalhos: [],
    };
  }
}
