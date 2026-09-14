import Anthropic from "@anthropic-ai/sdk";
import { MAPA_SISTEMA, SOBRE_O_SIG } from "./joao-mapa";
import { montarInstrucoesSDR } from "./joao-sdr";

// Dois modelos, escolhidos pelo tipo de conversa:
// - cliente logado pergunta "onde fica X": resposta curta de orientação, Haiku dá conta
//   e é muito mais barato por mensagem.
// - visitante na página de diagnóstico: conduz a conversa inteira, calcula números e
//   não pode escorregar nas regras de honestidade. Sonnet erra bem menos nisso.
const MODELO_CLIENTE = "claude-haiku-4-5-20251001";
const MODELO_DIAGNOSTICO = "claude-sonnet-4-6";

export type MensagemJoao = { role: "user" | "assistant"; content: string };

/** Dados que o João apurou durante a conversa de diagnóstico. */
export type LeadConversa = {
  nome: string | null;
  whatsapp: string | null;
  email: string | null;
  cidade: string | null;
  estabelecimento: string | null;
  tipoNegocio: string | null;
  numeroFuncionarios: number | null;
  itensCardapio: number | null;
  volumeVendasMes: number | null;
  descricaoOperacao: string | null;
  faturamentoMensal: number | null;
  comprasMensal: number | null;
  custoFuncionariosMensal: number | null;
  maiorPreocupacao: string | null;
  desafioLivre: string | null;
  interesseFinal: string | null;
  consentimentoLgpd: boolean;
};

export type RespostaJoao = {
  resposta: string;
  atalhos: { rotulo: string; url: string }[];
  lead?: LeadConversa | null;
};

const PERSONA = `Você é o João, o anfitrião do SIG.

Como você fala:
- Português do Brasil, direto e cordial, sem formalidade empolada.
- Sem emoji, sem exclamação em excesso, sem "olá, tudo bem?" a cada resposta.
- Trate a pessoa por você. Não invente o nome dela.

Quem você é:
- Você é um assistente do sistema, não uma pessoa. Se perguntarem, diga isso com naturalidade — nunca finja ser humano.

Limites que valem sempre:
- Nunca invente tela, botão ou funcionalidade. Se algo não está no mapa, diga com franqueza que o sistema não faz isso.
- Se a pessoa insistir num assunto que não é seu (receita de comida, notícia, conselho pessoal), diga que não é sua função e volte ao que você faz.
- Reclamação, problema de cobrança ou pedido de falar com uma pessoa: encaminhe para o WhatsApp +55 11 98550-3734.

Formato da resposta — responda APENAS com JSON, sem markdown e sem texto fora dele:
{"resposta": "sua resposta em texto corrido", "atalhos": [{"rotulo": "Criar minha conta", "url": "/cadastro"}]}

Sobre os atalhos:
- No máximo 2, e só com URLs que existem no mapa. Sem atalho quando não fizer sentido: "atalhos": [].
- O rótulo é curto e começa com verbo.`;

const MODO_PUBLICO_BASE = `A pessoa com quem você está falando AINDA NÃO ESTÁ LOGADA — é um visitante conhecendo o SIG.

Regras deste modo:
- Respostas de 2 a 6 frases. Nunca vire monólogo.
- Pode apresentar os planos listados abaixo e ajudar a escolher, com honestidade: quem só quer experimentar, o mensal; quem já decidiu, os períodos longos saem proporcionalmente mais baratos.
- Não prometa desconto, teste grátis, reembolso ou prazo que não esteja escrito aqui.
- Os atalhos possíveis neste modo são apenas /cadastro, /login e /diagnostico. Nunca mande alguém não logado para uma tela de /painel.
- Se a pessoa quiser falar com uma pessoa de verdade, indique o WhatsApp: +55 11 98550-3734.`;

const MODO_CLIENTE = `A pessoa já é cliente e está logada. Ela tem acesso a todas as telas do mapa, então pode mandar atalho de /painel à vontade.

Neste modo você é orientador, não vendedor:
- Respostas curtas: 2 a 5 frases. Quem pergunta onde fica algo não quer um manual.
- Você orienta sobre o sistema. Você NÃO analisa o negócio da pessoa, não calcula número, não dá diagnóstico financeiro nem opinião sobre o restaurante dela. Isso é trabalho do Consultor IA, e você indica o caminho até ele.
- Você não tem acesso aos dados do negócio da pessoa. Se perguntarem "quanto eu faturei", explique que quem mostra isso é o agente Financeiro e mande para lá.
- Assunto comercial, cobrança ou pedido de consultoria: encaminhe para o contato humano pelo WhatsApp, no link "Falar com o SIG" no topo da tela.`;

function getClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("Chave da Anthropic não configurada.");
  }
  return new Anthropic({ apiKey });
}

// Reforço final de formato, usado onde não há prefill para garantir o JSON.
const REFORCO_JSON = `LEMBRETE DE FORMATO — obrigatório

Sua resposta inteira deve ser UM objeto JSON válido e nada mais. Sem markdown, sem
crases, sem texto antes ou depois. Comece com { e termine com }.

Exemplo do formato exato:
{"resposta": "texto que a pessoa vai ler", "atalhos": [], "lead": null}

O texto conversacional vai DENTRO do campo "resposta" — nunca fora do JSON.`;

/**
 * A conversa de diagnóstico só acontece na página de diagnóstico. Nas demais telas
 * públicas o João volta a ser apenas anfitrião.
 */
function ehPaginaDiagnostico(telaAtual?: string | null): boolean {
  if (!telaAtual) return false;
  return telaAtual === "/diagnostico" || telaAtual.startsWith("/diagnostico/");
}

const TIPOS_NEGOCIO_VALIDOS = [
  "Bar",
  "Restaurante",
  "Café / Cafeteria",
  "Delivery / dark kitchen",
  "Outro",
];
const PREOCUPACOES_VALIDAS = [
  "Custo de insumos subindo mais rápido do que consigo repassar",
  "Ticket médio abaixo do que eu gostaria",
  "Não sei exatamente onde estou perdendo dinheiro",
  "Equipe e rotina de trabalho desorganizadas",
];
const INTERESSES_VALIDOS = [
  "videochamada_agendada",
  "aceitou_contato_consultor",
  "quer_contratar",
  "sem_interesse",
  "indefinido",
];

function texto(valor: any, max = 200): string | null {
  if (typeof valor !== "string") return null;
  const limpo = valor.trim();
  return limpo ? limpo.slice(0, max) : null;
}

function numero(valor: any): number | null {
  const n = typeof valor === "number" ? valor : Number(valor);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function inteiro(valor: any): number | null {
  const n = numero(valor);
  return n === null ? null : Math.round(n);
}

/**
 * Higieniza o que o modelo apurou antes de qualquer coisa chegar ao banco. Mesmo
 * com instrução clara, um modelo pode devolver "R$ 60.000" ou um tipo de negócio
 * fora da lista — e esses valores quebrariam a constraint da tabela.
 */
function sanitizarLead(bruto: any): LeadConversa | null {
  if (!bruto || typeof bruto !== "object") return null;

  const tipoNegocio = texto(bruto.tipoNegocio, 40);
  const maiorPreocupacao = texto(bruto.maiorPreocupacao, 120);
  const interesseFinal = texto(bruto.interesseFinal, 40);

  return {
    nome: texto(bruto.nome, 120),
    whatsapp: typeof bruto.whatsapp === "string"
      ? bruto.whatsapp.replace(/\D/g, "").slice(0, 20) || null
      : null,
    email: texto(bruto.email, 160),
    cidade: texto(bruto.cidade, 80),
    estabelecimento: texto(bruto.estabelecimento, 120),
    tipoNegocio:
      tipoNegocio && TIPOS_NEGOCIO_VALIDOS.includes(tipoNegocio) ? tipoNegocio : null,
    numeroFuncionarios: inteiro(bruto.numeroFuncionarios),
    itensCardapio: inteiro(bruto.itensCardapio),
    volumeVendasMes: inteiro(bruto.volumeVendasMes),
    descricaoOperacao: texto(bruto.descricaoOperacao, 1500),
    faturamentoMensal: numero(bruto.faturamentoMensal),
    comprasMensal: numero(bruto.comprasMensal),
    custoFuncionariosMensal: numero(bruto.custoFuncionariosMensal),
    maiorPreocupacao:
      maiorPreocupacao && PREOCUPACOES_VALIDAS.includes(maiorPreocupacao)
        ? maiorPreocupacao
        : null,
    desafioLivre: texto(bruto.desafioLivre, 600),
    interesseFinal:
      interesseFinal && INTERESSES_VALIDOS.includes(interesseFinal)
        ? interesseFinal
        : null,
    consentimentoLgpd: bruto.consentimentoLgpd === true,
  };
}

export async function responderJoao(params: {
  mensagens: MensagemJoao[];
  modo: "publico" | "cliente";
  telaAtual?: string | null;
  planos?: { nome: string; preco: number; dias: number }[];
  empresaNome?: string | null;
}): Promise<RespostaJoao> {
  const client = getClient();

  // Decide de uma vez se esta é a conversa de diagnóstico: visitante não logado,
  // na página de diagnóstico. Isso governa instruções, modelo e extração de lead.
  const modoDiagnostico =
    params.modo === "publico" && ehPaginaDiagnostico(params.telaAtual);

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

  const ondeEsta =
    params.telaAtual && !modoDiagnostico
      ? `\n\nA pessoa está agora na tela: ${params.telaAtual}. Leve isso em conta — se ela perguntar "como faço aqui", é desta tela que ela fala.`
      : "";

  const quem =
    params.modo === "cliente" && params.empresaNome
      ? `\n\nO negócio dela se chama ${params.empresaNome}.`
      : "";

  const system = [
    PERSONA,
    params.modo === "publico" ? MODO_PUBLICO_BASE : MODO_CLIENTE,
    SOBRE_O_SIG,
    MAPA_SISTEMA,
    modoDiagnostico ? montarInstrucoesSDR() : "",
    planosTexto,
    ondeEsta,
    quem,
    // Sem prefill, esta é a única garantia de que o formato virá certo. Fica por
    // último de propósito: é a instrução que o modelo deve ter mais fresca.
    modoDiagnostico ? REFORCO_JSON : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  // O prefill (começar a resposta com "{") força o modelo a continuar de dentro do
  // JSON, mas nem todo modelo aceita essa técnica. Onde não dá, a instrução explícita
  // no system + o recorte defensivo mais abaixo dão conta do recado.
  const usaPrefill = !modoDiagnostico;

  const resposta = await client.messages.create({
    model: modoDiagnostico ? MODELO_DIAGNOSTICO : MODELO_CLIENTE,
    max_tokens: modoDiagnostico ? 1200 : 700,
    system,
    messages: [
      ...params.mensagens.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      ...(usaPrefill
        ? [{ role: "assistant" as const, content: "{" }]
        : []),
    ],
  });

  const bloco = resposta.content.find((b) => b.type === "text");
  if (!bloco || bloco.type !== "text") {
    throw new Error("Sem resposta legível.");
  }

  // Com prefill, o "{" inicial não volta na resposta e precisa ser recolocado.
  // Sem prefill, a resposta já vem completa.
  const bruto = usaPrefill ? "{" + bloco.text : bloco.text;

  try {
    // Recorta do primeiro ao último caractere de objeto. Isso limpa tanto sobras de
    // texto quanto cercas de markdown (```json ... ```), que alguns modelos
    // adicionam mesmo quando instruídos a não fazer isso.
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
      // Lead só é extraído na conversa de diagnóstico.
      lead: modoDiagnostico ? sanitizarLead(parsed.lead) : null,
    };
  } catch {
    // Se ainda assim o JSON vier quebrado, entrega o texto limpo de qualquer resto
    // de estrutura, para a pessoa nunca ver chaves e aspas na tela.
    const semJson = bruto
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .replace(/\{[\s\S]*?"resposta"\s*:\s*"/, "")
      .replace(/"\s*,\s*"atalhos"[\s\S]*$/, "")
      .replace(/[{}]/g, "")
      .trim();

    return {
      resposta: semJson || "Não consegui formular a resposta. Pergunte de novo?",
      atalhos: [],
      lead: null,
    };
  }
}
