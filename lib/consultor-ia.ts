import Anthropic from "@anthropic-ai/sdk";
import { moeda, percentual } from "@/lib/formatters";
import type { AnaliseEstruturada } from "./consultor-dados";

export interface RecomendacaoGerada {
  categoria: "precificacao" | "estoque" | "financeiro" | "concentracao_gasto" | "ticket_medio";
  titulo: string;
  descricao: string;
  impacto_estimado: string | null;
}

export interface RelatorioGerado {
  conteudo: string;
  recomendacoes: RecomendacaoGerada[];
}

const SYSTEM_PROMPT = `Você é um consultor especialista em gestão de food service, escrevendo um relatório periódico para o dono de um pequeno restaurante no Brasil.

Estilo obrigatório:
- Autoridade técnica com empatia — nunca condescendente, nunca genérico.
- Sempre ancorado em número real fornecido, nunca invente dado.
- Linguagem operacional: CMV, margem, ticket médio — evite termos de "coaching" vazio como "gargalos" ou "dores".
- Direto ao ponto. Dono de restaurante não tem tempo para texto floreado.
- Quando um dado faltar (ex.: período anterior sem histórico), diga isso com naturalidade, não finja que sabe.

Formato de saída: responda APENAS com um JSON no formato abaixo, sem texto antes ou depois, sem markdown, sem \`\`\`json:

{
  "conteudo": "relatório completo em markdown, com títulos ## por seção",
  "recomendacoes": [
    {
      "categoria": "precificacao" | "estoque" | "financeiro" | "concentracao_gasto" | "ticket_medio",
      "titulo": "título curto e acionável",
      "descricao": "explicação com o número que sustenta a recomendação",
      "impacto_estimado": "texto curto tipo 'R$ 340/mês de margem recuperada', ou null se não for possível estimar"
    }
  ]
}`;

export async function gerarRelatorioConsultor(
  dados: AnaliseEstruturada,
  empresaNome: string
): Promise<RelatorioGerado> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Chave da Anthropic não configurada. Configure ANTHROPIC_API_KEY no .env.local para gerar relatórios."
    );
  }

  const client = new Anthropic({ apiKey });

  const resumoDados = montarResumoLegivel(dados, empresaNome);

  const response = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 3000,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: resumoDados }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("A IA não retornou um relatório legível.");
  }

  let parsed: any;
  try {
    const limpo = textBlock.text.replace(/```json|```/g, "").trim();
    parsed = JSON.parse(limpo);
  } catch {
    throw new Error("Não foi possível interpretar a resposta da IA.");
  }

  return {
    conteudo: String(parsed.conteudo ?? ""),
    recomendacoes: Array.isArray(parsed.recomendacoes)
      ? parsed.recomendacoes.map((r: any) => ({
          categoria: r.categoria,
          titulo: String(r.titulo ?? ""),
          descricao: String(r.descricao ?? ""),
          impacto_estimado: r.impacto_estimado ?? null,
        }))
      : [],
  };
}

/**
 * Converte os dados estruturados em texto legível para o modelo.
 * Fazer essa tradução em código (em vez de mandar o JSON cru) reduz
 * a chance da IA "alucinar" interpretação errada de um campo técnico.
 */
function montarResumoLegivel(d: AnaliseEstruturada, empresaNome: string): string {
  const partes: string[] = [];

  partes.push(`Empresa: ${empresaNome}`);
  partes.push(`Período analisado: ${d.periodo.inicio} a ${d.periodo.fim}`);

  if (!d.temDadosSuficientes) {
    partes.push(
      "\nATENÇÃO: não há faturamento lançado neste período. Escreva um relatório curto orientando o dono a começar lançando vendas e despesas, sem inventar números."
    );
    return partes.join("\n");
  }

  const f = d.financeiro.atual;
  partes.push(`\n## Financeiro do período`);
  partes.push(`Receita bruta: ${moeda(f.receita_bruta)}`);
  partes.push(`CMV: ${percentual(f.cmv_percentual)}`);
  partes.push(`Ticket médio: ${moeda(f.ticket_medio)}`);
  partes.push(`Lucro líquido: ${moeda(f.lucro_liquido)} (margem ${percentual(f.margem_liquida)})`);

  if (d.financeiro.variacaoReceita !== null) {
    partes.push(
      `\nComparado ao período anterior (${d.periodoAnterior.inicio} a ${d.periodoAnterior.fim}): receita variou ${d.financeiro.variacaoReceita.toFixed(1)}%.`
    );
    if (d.financeiro.variacaoLucro !== null) {
      partes.push(`Lucro líquido variou ${d.financeiro.variacaoLucro.toFixed(1)}%.`);
    }
  } else {
    partes.push(`\nSem dados do período anterior para comparação.`);
  }

  if (d.produtosForaDaMeta.length > 0) {
    partes.push(`\n## Produtos com CMV acima da meta`);
    for (const p of d.produtosForaDaMeta) {
      partes.push(
        `- ${p.nome}: preço atual ${moeda(p.precoAtual)}, custo de ficha ${moeda(p.custoFicha)}, CMV ${percentual(p.cmvPercentual)}. Preço que traria o CMV para a meta: ${moeda(p.precoSugerido)}.`
      );
    }
  } else {
    partes.push(`\nNenhum produto com CMV acima da meta configurada.`);
  }

  if (d.estoqueBaixo.length > 0) {
    partes.push(`\n## Insumos abaixo do estoque mínimo`);
    for (const i of d.estoqueBaixo) {
      partes.push(
        `- ${i.nome}: ${i.estoqueAtual} ${i.unidade} em estoque, mínimo configurado é ${i.estoqueMinimo} ${i.unidade}.`
      );
    }
  }

  if (d.concentracaoFornecedores.length > 0) {
    partes.push(`\n## Maiores fornecedores do período`);
    for (const c of d.concentracaoFornecedores) {
      partes.push(`- ${c.nome}: ${moeda(c.valor)} (${c.participacao.toFixed(1)}% do total gasto)`);
    }
  }

  if (d.sugestoesTicketMedio.produtosAltaMargem.length > 0) {
    partes.push(`\n## Produtos de maior margem (candidatos a combo/upsell)`);
    partes.push(`Ticket médio atual: ${moeda(d.sugestoesTicketMedio.ticketMedioAtual)}`);
    for (const p of d.sugestoesTicketMedio.produtosAltaMargem) {
      partes.push(
        `- ${p.nome} (${p.categoria ?? "sem categoria"}): ${moeda(p.preco)}, margem ${p.margemPercentual.toFixed(1)}%`
      );
    }
    if (d.sugestoesTicketMedio.categoriasSemComplemento.length > 0) {
      partes.push(
        `\nO cardápio não tem categoria de: ${d.sugestoesTicketMedio.categoriasSemComplemento.join(", ")}. Sem sobremesa/bebida cadastrada, não há como sugerir complemento — isso é uma oportunidade de ticket médio perdida por si só.`
      );
    }
    partes.push(
      `\nIMPORTANTE sobre ticket médio: não há dado de volume de venda por prato ainda — toda sugestão de combo deve se basear em MARGEM, não em popularidade. Nunca escreva que um prato "vende muito" ou é "o favorito" — isso não pode ser verificado com os dados disponíveis.`
    );
  }

  partes.push(
    `\nEscreva o relatório com base SOMENTE nestes dados. Se algo não está listado acima (ex.: engenharia de cardápio por volume de venda, previsão de consumo), não fale sobre isso — esses dados ainda não são coletados pelo sistema.`
  );

  return partes.join("\n");
}
