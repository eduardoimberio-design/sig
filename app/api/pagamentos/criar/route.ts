import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { criarLinkPagamento } from "@/lib/infinitepay";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  plano_id: z.string().uuid("Plano inválido."),
});

export async function POST(req: NextRequest) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  }

  const corpo = await req.json().catch(() => null);
  const parsed = schema.safeParse(corpo);

  if (!parsed.success) {
    return NextResponse.json(
      { erro: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  // Empresa vem do vínculo do usuário — nunca do corpo da requisição,
  // para impedir que alguém pague pelo acesso de outra empresa.
  const { data: vinculo } = await supabase
    .from("usuarios_empresa")
    .select("empresa_id, nome")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!vinculo) {
    return NextResponse.json(
      { erro: "Usuário sem empresa vinculada." },
      { status: 400 }
    );
  }

  const { data: plano } = await supabase
    .from("planos")
    .select("id, nome, preco, duracao_dias, ativo")
    .eq("id", parsed.data.plano_id)
    .maybeSingle();

  if (!plano || !plano.ativo) {
    return NextResponse.json({ erro: "Plano indisponível." }, { status: 400 });
  }

  if (Number(plano.preco) <= 0) {
    return NextResponse.json(
      { erro: "Este plano ainda não tem preço definido." },
      { status: 400 }
    );
  }

  // Cria o registro de pagamento pendente. O ID dele vira o order_nsu.
  const admin = createAdminClient();
  const { data: pagamento, error: erroPag } = await admin
    .from("pagamentos")
    .insert({
      empresa_id: vinculo.empresa_id,
      plano_id: plano.id,
      valor: plano.preco,
      dias_creditados: plano.duracao_dias,
      status: "pendente",
      gateway: "infinitepay",
    })
    .select("id")
    .single();

  if (erroPag || !pagamento) {
    return NextResponse.json(
      { erro: "Falha ao registrar pagamento." },
      { status: 500 }
    );
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL!;

  try {
    const { url } = await criarLinkPagamento({
      orderNsu: pagamento.id,
      descricao: `SIG — Plano ${plano.nome} (${plano.duracao_dias} dias)`,
      valorReais: Number(plano.preco),
      redirectUrl: `${baseUrl}/painel/acesso?retorno=1`,
      webhookUrl: `${baseUrl}/api/webhooks/infinitepay`,
      cliente: { nome: vinculo.nome, email: user.email ?? undefined },
    });

    await admin
      .from("pagamentos")
      .update({ checkout_url: url })
      .eq("id", pagamento.id);

    return NextResponse.json({ url });
  } catch {
    await admin
      .from("pagamentos")
      .update({ status: "falhou" })
      .eq("id", pagamento.id);

    return NextResponse.json(
      { erro: "Não foi possível gerar o link de pagamento. Tente novamente." },
      { status: 502 }
    );
  }
}
