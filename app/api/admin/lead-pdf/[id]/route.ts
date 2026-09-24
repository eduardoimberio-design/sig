// app/api/admin/lead-pdf/[id]/route.ts
//
// Devolve os dados de um lead já gravado, no formato que o gerador de PDF espera.
//
// Diferente do PDF que o lead baixa durante a conversa (que extrai os dados do
// diálogo em tempo real), aqui os números já estão no banco — não há nada a
// interpretar, só a ler. Por isso não usa a API da Anthropic e é instantâneo.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  }

  // Mesma checagem usada nas outras telas de admin do projeto.
  const { data: admin } = await supabase
    .from("admins_sig")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!admin) {
    return NextResponse.json({ erro: "Acesso restrito." }, { status: 403 });
  }

  // A tabela de leads não tem policy de leitura — de propósito, para que
  // ninguém consiga ler lead pelo navegador. A listagem do admin funciona
  // porque usa função security definer; aqui o acesso direto era bloqueado
  // e o lead aparecia como inexistente. Depois da checagem de admin acima,
  // lemos com a chave de servidor.
  const admin_db = createAdminClient();

  const { data: lead, error } = await admin_db
    .from("leads_diagnostico")
    .select(
      "nome, estabelecimento, cidade, tipo_negocio, faturamento_mensal, compras_mensal, custo_funcionarios_mensal, cmv_percentual, custo_pessoal_percentual, prime_cost_percentual, causa_raiz, acao_recomendada"
    )
    .eq("id", params.id)
    .maybeSingle();

  if (error) {
    console.error("[lead-pdf] falha ao ler:", error.message);
    return NextResponse.json(
      { erro: `Falha ao ler o lead: ${error.message}` },
      { status: 500 }
    );
  }

  if (!lead) {
    return NextResponse.json({ erro: "Lead não encontrado." }, { status: 404 });
  }

  // O banco pode devolver numeric como texto. O gerador faz conta com esses
  // valores; texto ali quebra o PDF sem aviso.
  const num = (v: unknown) => {
    if (v === null || v === undefined || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  return NextResponse.json({
    nome: lead.nome,
    estabelecimento: lead.estabelecimento,
    cidade: lead.cidade,
    tipoNegocio: lead.tipo_negocio,
    faturamentoMensal: num(lead.faturamento_mensal),
    comprasMensal: num(lead.compras_mensal),
    custoFuncionariosMensal: num(lead.custo_funcionarios_mensal),
    cmvPercentual: num(lead.cmv_percentual),
    custoPessoalPercentual: num(lead.custo_pessoal_percentual),
    primeCostPercentual: num(lead.prime_cost_percentual),
    causaRaiz: lead.causa_raiz,
    acaoRecomendada: lead.acao_recomendada,
  });
}
