// app/api/diagnostico-pdf/route.ts
//
// Devolve os dados estruturados do diagnóstico para o navegador montar o PDF.
//
// Por que passar pelo servidor em vez de o navegador extrair sozinho: a extração usa
// a API da Anthropic, e a chave nunca pode ir para o navegador. Além disso, reusar o
// mesmo extrator garante que o PDF mostre exatamente os números que foram gravados
// no lead — sem risco de divergência entre o que a pessoa baixa e o que você vê no
// painel.

import { NextResponse } from "next/server";
import { extrairLead } from "@/lib/joao-extrator";
import type { MensagemJoao } from "@/lib/joao-ia";

export const dynamic = "force-dynamic";

const MAX_HISTORICO = 40;
const MAX_CARACTERES = 2000;

export async function POST(req: Request) {
  let corpo: any;
  try {
    corpo = await req.json();
  } catch {
    return NextResponse.json({ erro: "Requisição inválida." }, { status: 400 });
  }

  const mensagensBrutas = Array.isArray(corpo?.mensagens) ? corpo.mensagens : [];

  const mensagens: MensagemJoao[] = mensagensBrutas
    .filter(
      (m: any) =>
        (m?.role === "user" || m?.role === "assistant") &&
        typeof m?.content === "string" &&
        m.content.trim()
    )
    .slice(-MAX_HISTORICO)
    .map((m: any) => ({
      role: m.role,
      content: String(m.content).slice(0, MAX_CARACTERES),
    }));

  if (mensagens.length < 4) {
    return NextResponse.json(
      { erro: "Conversa curta demais para gerar um diagnóstico." },
      { status: 400 }
    );
  }

  try {
    const lead = await extrairLead(mensagens);

    if (!lead || !lead.faturamentoMensal) {
      return NextResponse.json(
        { erro: "Ainda não tenho números suficientes para montar o diagnóstico." },
        { status: 400 }
      );
    }

    const cmv =
      lead.comprasMensal && lead.faturamentoMensal
        ? (lead.comprasMensal / lead.faturamentoMensal) * 100
        : null;
    const pessoal =
      lead.custoFuncionariosMensal && lead.faturamentoMensal
        ? (lead.custoFuncionariosMensal / lead.faturamentoMensal) * 100
        : null;

    return NextResponse.json({
      nome: lead.nome,
      estabelecimento: lead.estabelecimento,
      cidade: lead.cidade,
      tipoNegocio: lead.tipoNegocio,
      faturamentoMensal: lead.faturamentoMensal,
      comprasMensal: lead.comprasMensal,
      custoFuncionariosMensal: lead.custoFuncionariosMensal,
      cmvPercentual: cmv,
      custoPessoalPercentual: pessoal,
      primeCostPercentual: cmv !== null && pessoal !== null ? cmv + pessoal : null,
      causaRaiz: lead.causaRaiz,
      acaoRecomendada: lead.acaoRecomendada,
    });
  } catch (e: any) {
    console.error("[PDF diagnóstico] falha:", e?.message ?? e);
    return NextResponse.json(
      { erro: "Não foi possível montar o diagnóstico agora." },
      { status: 500 }
    );
  }
}
