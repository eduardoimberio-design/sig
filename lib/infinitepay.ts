const BASE_URL = "https://api.checkout.infinitepay.io";

function getHandle(): string {
  const handle = process.env.INFINITEPAY_HANDLE;
  if (!handle) throw new Error("INFINITEPAY_HANDLE não configurado.");
  return handle.replace(/^\$/, ""); // a InfiniteTag vai sem o "$"
}

export interface CriarLinkParams {
  /** ID do nosso registro em `pagamentos` — volta no webhook como order_nsu */
  orderNsu: string;
  descricao: string;
  /** Valor em reais (ex.: 297.00). Convertido para centavos internamente. */
  valorReais: number;
  redirectUrl: string;
  webhookUrl: string;
  cliente?: { nome?: string; email?: string; telefone?: string };
}

export async function criarLinkPagamento(
  params: CriarLinkParams
): Promise<{ url: string }> {
  const body: Record<string, unknown> = {
    handle: getHandle(),
    order_nsu: params.orderNsu,
    redirect_url: params.redirectUrl,
    webhook_url: params.webhookUrl,
    items: [
      {
        quantity: 1,
        // A API trabalha em centavos: R$ 10,00 = 1000
        price: Math.round(params.valorReais * 100),
        description: params.descricao,
      },
    ],
  };

  if (params.cliente) {
    body.customer = {
      name: params.cliente.nome,
      email: params.cliente.email,
      phone_number: params.cliente.telefone,
    };
  }

  const res = await fetch(`${BASE_URL}/links`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const texto = await res.text();
    throw new Error(`InfinitePay: falha ao criar link (${res.status}) ${texto}`);
  }

  const data = (await res.json()) as { url?: string };
  if (!data.url) throw new Error("InfinitePay: resposta sem URL de checkout.");
  return { url: data.url };
}

export interface VerificacaoPagamento {
  success: boolean;
  paid: boolean;
  amount?: number;       // centavos
  paid_amount?: number;  // centavos
  installments?: number;
  capture_method?: string;
}

/**
 * SEGURANÇA — esta função é obrigatória.
 *
 * O webhook da InfinitePay não é assinado criptograficamente, ou seja,
 * qualquer pessoa que descubra a URL poderia forjar uma notificação de
 * pagamento e liberar acesso de graça. Por isso NUNCA creditamos acesso
 * com base no conteúdo do webhook: usamos o webhook apenas como um
 * "aviso" e confirmamos o pagamento consultando a própria InfinitePay.
 */
export async function verificarPagamento(input: {
  orderNsu: string;
  transactionNsu: string;
  slug: string;
}): Promise<VerificacaoPagamento> {
  const res = await fetch(`${BASE_URL}/payment_check`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      handle: getHandle(),
      order_nsu: input.orderNsu,
      transaction_nsu: input.transactionNsu,
      slug: input.slug,
    }),
  });

  if (!res.ok) {
    throw new Error(`InfinitePay: falha na verificação (${res.status})`);
  }

  return (await res.json()) as VerificacaoPagamento;
}
