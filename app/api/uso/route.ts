import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Deriva o módulo a partir da rota. Feito aqui e gravado junto para
 * o painel não precisar interpretar string na hora de agregar.
 */
function moduloDaRota(rota: string): string {
  const partes = rota.split("/").filter(Boolean); // ["painel","financeiro",...]
  if (partes[0] !== "painel") return "outro";
  return partes[1] ?? "inicio";
}

const ROTAS_VALIDAS = /^\/painel(\/[a-z0-9\-\/\[\]]*)?$/i;

export async function POST(req: Request) {
  let corpo: any;
  try {
    corpo = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const rota = typeof corpo?.rota === "string" ? corpo.rota.slice(0, 120) : "";
  if (!rota || !ROTAS_VALIDAS.test(rota)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Sem sessão não há o que registrar. Silencioso de propósito: isto
  // é telemetria, nunca deve chamar atenção do usuário.
  if (!user) return NextResponse.json({ ok: true });

  const { data: vinculo } = await supabase
    .from("usuarios_empresa")
    .select("empresa_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!vinculo) return NextResponse.json({ ok: true });

  const admin = createAdminClient();

  await Promise.all([
    admin.from("uso_navegacao").insert({
      empresa_id: vinculo.empresa_id,
      auth_user_id: user.id,
      rota,
      modulo: moduloDaRota(rota),
    }),
    admin
      .from("empresas")
      .update({ ultimo_acesso_em: new Date().toISOString() })
      .eq("id", vinculo.empresa_id),
  ]);

  return NextResponse.json({ ok: true });
}
