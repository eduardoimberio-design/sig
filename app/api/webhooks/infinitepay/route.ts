import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verificarPagamento } from "@/lib/infinitepay";
import { registrarEvento } from "@/lib/eventos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface WebhookPayload {
  invoice_slug?: string;
  amount?: number;
  paid_amount?: number;
  installments?: number;
  capture_method?: string;
  transaction_nsu?: string;
  order_nsu?: string;
  receipt_url?: string;
}

export async function POST(req: NextRequest) {
  let payload: WebhookPayload;

  try {
    payload = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Payload inválido" },
      { status: 400 }
    );
  }

  const { order_nsu, transaction_nsu, invoice_slug, receipt_url } = payload;

  if (!order_nsu || !transaction_nsu || !invoice_slug) {
    return NextResponse.json(
      { success: false, message: "Campos obrigatórios ausentes" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  // 1. O order_nsu é o ID do nosso registro em `pagamentos`.
  //    Se não existir, é uma notificação forjada ou de outro sistema.
  const { data: pagamento, error: erroBusca } = await supabase
    .from("pagamentos")
    .select("id, status, valor, empresa_id")
    .eq("id", order_nsu)
    .maybeSingle();

  if (erroBusca || !pagamento) {
    return NextResponse.json(
      { success: false, message: "Pedido não encontrado" },
      { status: 400 }
    );
  }

  // 2. Idempotência: se já creditamos, respondemos 200 para a
  //    InfinitePay parar de reenviar, sem creditar de novo.
  if (pagamento.status === "confirmado") {
    return NextResponse.json({ success: true, message: null });
  }

  // 3. VERIFICAÇÃO OBRIGATÓRIA — nunca confiar no corpo do webhook.
  let verificacao;
  try {
    verificacao = await verificarPagamento({
      orderNsu: order_nsu,
      transactionNsu: transaction_nsu,
      slug: invoice_slug,
    });
  } catch {
    // Erro de rede/API: devolvemos 400 para a InfinitePay reenviar depois.
    await registrarEvento({
      origem: "pagamento",
      tipo: "pagamento_falhou",
      severidade: "critico",
      mensagem: "Não consegui verificar o pagamento junto à InfinitePay.",
      detalhe: { order_nsu },
    });
    return NextResponse.json(
      { success: false, message: "Falha ao verificar pagamento" },
      { status: 400 }
    );
  }

  if (!verificacao.success || !verificacao.paid) {
    return NextResponse.json(
      { success: false, message: "Pagamento não confirmado" },
      { status: 400 }
    );
  }

  // 4. Confere o valor: o pago não pode ser menor que o esperado.
  const centavosEsperados = Math.round(Number(pagamento.valor) * 100);
  const centavosPagos = verificacao.paid_amount ?? verificacao.amount ?? 0;

  if (centavosPagos < centavosEsperados) {
    await supabase
      .from("pagamentos")
      .update({ status: "falhou" })
      .eq("id", pagamento.id);

    return NextResponse.json(
      { success: false, message: "Valor divergente" },
      { status: 400 }
    );
  }

  // 5. Registra os dados da transação e credita o acesso.
  await supabase
    .from("pagamentos")
    .update({
      transaction_nsu,
      invoice_slug,
      receipt_url: receipt_url ?? null,
      forma_pagamento: verificacao.capture_method ?? null,
    })
    .eq("id", pagamento.id);

  const { data: resultado, error: erroCredito } = await supabase.rpc(
    "creditar_pagamento",
    { p_pagamento_id: pagamento.id }
  );

  if (erroCredito || !resultado?.sucesso) {
    return NextResponse.json(
      { success: false, message: "Falha ao creditar acesso" },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true, message: null });
}
