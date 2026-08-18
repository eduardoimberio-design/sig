import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }

  let corpo: any;
  try {
    corpo = await req.json();
  } catch {
    return NextResponse.json({ erro: "Requisição inválida." }, { status: 400 });
  }

  if (typeof corpo?.id !== "string") {
    return NextResponse.json({ erro: "Relatório não informado." }, { status: 400 });
  }

  // A RLS já exige is_admin_sig() — quem não for admin não altera nada.
  const { error } = await supabase
    .from("resumos_sentinela")
    .update({ lido: true })
    .eq("id", corpo.id);

  if (error) {
    return NextResponse.json({ erro: "Falha ao marcar." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
