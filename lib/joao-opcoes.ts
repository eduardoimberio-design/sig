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

/**
 * O fechamento do diagnóstico: as duas saídas que a pessoa escolhe clicando.
 * O texto é o que ela vê no botão E o que o sistema usa para saber a intenção —
 * ver INTERESSE_POR_FECHAMENTO, logo abaixo.
 */
export const FECHAMENTOS = [
  "Quero começar a usar o SIG agora",
  "Prefiro agendar uma sessão estratégica gratuita",
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
  fechamento: FECHAMENTOS,
};

/**
 * De qual botão de fechamento a pessoa clicou para o interesse_final gravado no
 * lead. Em código, e não por leitura do modelo: o clique é inequívoco, e deixar a
 * IA interpretar uma intenção que já está explícita seria inventar incerteza.
 *
 * "Prefiro agendar" vira aceitou_contato_consultor, não videochamada_agendada —
 * no clique ela aceitou o contato, mas ainda não disse dia nem período. Quando
 * disser, o extrator promove para videochamada_agendada.
 */
export const INTERESSE_POR_FECHAMENTO: Record<string, string> = {
  "Quero começar a usar o SIG agora": "quer_contratar",
  "Prefiro agendar uma sessão estratégica gratuita": "aceitou_contato_consultor",
};

/** O interesse que o clique de fechamento indica, ou null se não houve clique. */
export function interessePorFechamento(
  mensagens: { role: "user" | "assistant"; content: string }[]
): string | null {
  for (let i = mensagens.length - 1; i >= 0; i--) {
    const m = mensagens[i];
    if (m.role !== "user") continue;
    const achado = INTERESSE_POR_FECHAMENTO[m.content.trim()];
    if (achado) return achado;
  }
  return null;
}

/** Devolve os botões de uma pergunta, ou null se a chave não for conhecida. */
export function opcoesDaPergunta(chave: unknown): string[] | null {
  if (typeof chave !== "string") return null;
  const itens = OPCOES_POR_PERGUNTA[chave.trim()];
  return itens ? [...itens] : null;
}

/**
 * Quais perguntas de botão a pessoa já respondeu, pelo texto exato de uma opção.
 *
 * Existe porque o modelo repetiu a pergunta do tipo de estabelecimento depois de a
 * pessoa já ter clicado: a resposta por botão é curta e ele não a reconheceu como
 * resposta. Em vez de insistir no prompt, o sistema passa a saber o que já foi
 * respondido — e a repetição deixa de depender de o modelo lembrar.
 */
export function respostasJaDadas(
  mensagens: { role: "user" | "assistant"; content: string }[]
): Record<string, string> {
  const dadas: Record<string, string> = {};

  for (const m of mensagens) {
    if (m.role !== "user") continue;
    const texto = m.content.trim();
    for (const [chave, itens] of Object.entries(OPCOES_POR_PERGUNTA)) {
      const achado = itens.find((i) => i === texto);
      // A última resposta vale: se a pessoa clicou de novo, foi para corrigir.
      if (achado) dadas[chave] = achado;
    }
  }

  return dadas;
}

const ROTULO_PERGUNTA: Record<string, string> = {
  tipo_negocio: "tipo de estabelecimento",
  maior_preocupacao: "situação que mais pesa (dor principal)",
  fechamento: "o que quer fazer a seguir",
};

/** Bloco para o contexto do João: o que já foi respondido e não deve ser perguntado. */
export function blocoRespostasJaDadas(dadas: Record<string, string>): string | null {
  const chaves = Object.keys(dadas);
  if (chaves.length === 0) return null;

  return [
    "RESPOSTAS JÁ REGISTRADAS — a pessoa já respondeu, clicando nos botões:",
    ...chaves.map((c) => `- ${ROTULO_PERGUNTA[c] ?? c}: ${dadas[c]}`),
    "NÃO pergunte nenhuma destas de novo e não peça os botões delas outra vez.",
    "Considere a informação recebida e siga para a próxima etapa do roteiro.",
  ].join("\n");
}
