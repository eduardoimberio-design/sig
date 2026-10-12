// lib/joao-opcoes.ts
//
// Única fonte das listas fechadas da conversa do João.
//
// Estes valores são os mesmos aceitos pelos CHECK da tabela leads_diagnostico. Eles
// estavam repetidos em três arquivos (joao-ia, joao-extrator e a rota), o que abria
// espaço para divergência silenciosa: uma lista mudava, as outras não, e o lead era
// gravado com null nesse campo sem ninguém perceber.
//
// Daqui saem também os botões de múltipla escolha mostrados na conversa. Isso é
// deliberado: o rótulo do botão É o valor gravado no banco. O modelo nunca escreve
// essas opções — ele só diz QUAL pergunta está fazendo, e o sistema monta os botões.
// Assim o texto clicado passa no CHECK por construção, em vez de depender de o
// modelo reproduzir "Café / Cafeteria" com o espaçamento e o acento exatos.

export const TIPOS_NEGOCIO = [
  "Bar",
  "Restaurante",
  "Café / Cafeteria",
  "Delivery / dark kitchen",
  "Outro",
];

export const PREOCUPACOES = [
  "Custo de insumos subindo mais rápido do que consigo repassar",
  "Ticket médio abaixo do que eu gostaria",
  "Não sei exatamente onde estou perdendo dinheiro",
  "Equipe e rotina de trabalho desorganizadas",
];

export const INTERESSES = [
  "videochamada_agendada",
  "aceitou_contato_consultor",
  "quer_contratar",
  "sem_interesse",
  "indefinido",
];

/**
 * Perguntas que o João faz com botões em vez de texto livre. A chave é o que o
 * modelo devolve no JSON; os itens são montados aqui.
 */
export const OPCOES_POR_PERGUNTA: Record<string, string[]> = {
  tipo_negocio: TIPOS_NEGOCIO,
  maior_preocupacao: PREOCUPACOES,
};

/** Devolve os botões de uma pergunta, ou null se a chave não for conhecida. */
export function opcoesDaPergunta(chave: unknown): string[] | null {
  if (typeof chave !== "string") return null;
  const itens = OPCOES_POR_PERGUNTA[chave.trim()];
  return itens ? [...itens] : null;
}
