// lib/joao-extrator.ts
//
// Extração dos dados do lead a partir da conversa.
//
// Por que isto existe em vez de pedir ao João para enviar os dados junto com a
// resposta: o prompt do João é longo (roteiro, cálculo, objeções, limites), e a
// instrução de "inclua também um campo lead no JSON" acabava ignorada — ele
// priorizava escrever a resposta conversacional, que é o que a pessoa vê. Resultado:
// a conversa ficava ótima e o lead se perdia.
//
// Aqui a extração é uma chamada separada, com um único trabalho: ler a conversa e
// devolver os campos. Sem roteiro, sem persona, sem nada competindo por atenção.
// Roda em modelo leve porque é tarefa mecânica, então o custo extra é pequeno.

import Anthropic from "@anthropic-ai/sdk";
import type { LeadConversa, MensagemJoao } from "./joao-ia";

const MODELO_EXTRATOR = "claude-haiku-4-5-20251001";

const INSTRUCAO = `Você extrai dados estruturados de uma conversa entre um assistente (João) e um dono de restaurante/bar/delivery.

Leia a conversa e devolva APENAS um objeto JSON, sem markdown, sem texto antes ou depois.

Formato exato:
{
  "nome": "nome completo da pessoa, ou null",
  "whatsapp": "só dígitos, ex: 11999999999, ou null",
  "email": "email, ou null",
  "cidade": "cidade do estabelecimento, ou null",
  "estabelecimento": "nome do negócio, ou null",
  "tipoNegocio": "Bar | Restaurante | Café / Cafeteria | Delivery / dark kitchen | Outro | null",
  "numeroFuncionarios": número inteiro ou null,
  "itensCardapio": número inteiro ou null,
  "volumeVendasMes": número inteiro ou null,
  "descricaoOperacao": "como a pessoa descreveu a operação dela, nas palavras dela, ou null",
  "faturamentoMensal": número ou null,
  "comprasMensal": número ou null,
  "custoFuncionariosMensal": número ou null,
  "causaRaiz": "resumo em 1-2 frases da causa que o João identificou, ou null",
  "acaoRecomendada": "a ação que o João recomendou, ou null",
  "maiorPreocupacao": "Custo de insumos subindo mais rápido do que consigo repassar | Ticket médio abaixo do que eu gostaria | Não sei exatamente onde estou perdendo dinheiro | Equipe e rotina de trabalho desorganizadas | null",
  "desafioLivre": "qualquer coisa relevante que a pessoa disse e não cabe nos outros campos, ou null",
  "interesseFinal": "videochamada_agendada | aceitou_contato_consultor | quer_contratar | sem_interesse | indefinido",
  "agendamentoSolicitado": "o dia e período que a pessoa pediu para a videochamada, ex: 'quarta-feira de manhã', ou null",
  "consentimentoLgpd": true ou false
}

REGRAS:
- Valores em dinheiro e quantidades vão como número puro: 85000, não "R$ 85.000".
- Se um dado não aparece na conversa, use null. NUNCA invente.
- "consentimentoLgpd" é true apenas se a pessoa concordou explicitamente em seguir
  após o pedido de consentimento na abertura.
- "tipoNegocio" e "maiorPreocupacao" devem ser exatamente um dos valores listados.
- "interesseFinal": use "videochamada_agendada" se a pessoa aceitou e informou dia,
  "aceitou_contato_consultor" se aceitou contato mas sem definir dia,
  "quer_contratar" se ela quis ir direto ao cadastro,
  "sem_interesse" se recusou claramente,
  "indefinido" se a conversa não chegou a esse ponto.`;

function getClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Chave da Anthropic não configurada.");
  return new Anthropic({ apiKey });
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
  if (!limpo || limpo.toLowerCase() === "null") return null;
  return limpo.slice(0, max);
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
 * Lê a conversa e devolve os dados do lead. Retorna null se não houver dados
 * suficientes para valer um registro.
 */
export async function extrairLead(
  mensagens: MensagemJoao[]
): Promise<(LeadConversa & { agendamentoSolicitado: string | null }) | null> {
  const client = getClient();

  const conversa = mensagens
    .map((m) => `${m.role === "user" ? "PESSOA" : "JOÃO"}: ${m.content}`)
    .join("\n\n");

  const resposta = await client.messages.create({
    model: MODELO_EXTRATOR,
    max_tokens: 1500,
    system: INSTRUCAO,
    messages: [
      { role: "user", content: `Conversa:\n\n${conversa}` },
      { role: "assistant", content: "{" },
    ],
  });

  const bloco = resposta.content.find((b) => b.type === "text");
  if (!bloco || bloco.type !== "text") return null;

  const bruto = "{" + bloco.text;
  const inicio = bruto.indexOf("{");
  const fim = bruto.lastIndexOf("}");
  if (inicio < 0 || fim <= inicio) return null;

  let dados: any;
  try {
    dados = JSON.parse(bruto.slice(inicio, fim + 1));
  } catch {
    return null;
  }

  const tipoNegocio = texto(dados.tipoNegocio, 40);
  const maiorPreocupacao = texto(dados.maiorPreocupacao, 120);
  const interesseFinal = texto(dados.interesseFinal, 40);

  return {
    nome: texto(dados.nome, 120),
    whatsapp:
      typeof dados.whatsapp === "string"
        ? dados.whatsapp.replace(/\D/g, "").slice(0, 20) || null
        : null,
    email: texto(dados.email, 160),
    cidade: texto(dados.cidade, 80),
    estabelecimento: texto(dados.estabelecimento, 120),
    tipoNegocio:
      tipoNegocio && TIPOS_NEGOCIO_VALIDOS.includes(tipoNegocio) ? tipoNegocio : null,
    numeroFuncionarios: inteiro(dados.numeroFuncionarios),
    itensCardapio: inteiro(dados.itensCardapio),
    volumeVendasMes: inteiro(dados.volumeVendasMes),
    descricaoOperacao: texto(dados.descricaoOperacao, 1500),
    faturamentoMensal: numero(dados.faturamentoMensal),
    comprasMensal: numero(dados.comprasMensal),
    custoFuncionariosMensal: numero(dados.custoFuncionariosMensal),
    causaRaiz: texto(dados.causaRaiz, 1000),
    acaoRecomendada: texto(dados.acaoRecomendada, 1000),
    maiorPreocupacao:
      maiorPreocupacao && PREOCUPACOES_VALIDAS.includes(maiorPreocupacao)
        ? maiorPreocupacao
        : null,
    desafioLivre: texto(dados.desafioLivre, 600),
    interesseFinal:
      interesseFinal && INTERESSES_VALIDOS.includes(interesseFinal)
        ? interesseFinal
        : "indefinido",
    agendamentoSolicitado: texto(dados.agendamentoSolicitado, 200),
    consentimentoLgpd: dados.consentimentoLgpd === true,
  };
}
