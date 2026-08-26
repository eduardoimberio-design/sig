// app/api/admin/diagnosticos/[id]/route.ts
//
// AJUSTE NECESSÁRIO: adicione aqui a mesma checagem de sessão/autenticação de admin
// usada nas outras rotas /api/admin/* do SIG antes de liberar o PATCH. Sem essa
// checagem, qualquer pessoa que descobrir a URL poderia alterar o status de um lead.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

const statusSchema = z.object({
  status: z.enum([
    "novo",
    "contatado",
    "em_conversa",
    "sessao_agendada",
    "proposta",
    "fechado",
    "perdido",
  ]),
});

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  // AJUSTE NECESSÁRIO: valide a sessão de admin aqui antes de prosseguir.

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corpo da requisição inválido" }, { status: 400 });
  }

  const parsed = statusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Status inválido" }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: "Erro de configuração do servidor" }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  const { error } = await supabase
    .from("leads_diagnostico")
    .update({ status: parsed.data.status })
    .eq("id", params.id);

  if (error) {
    console.error("Erro ao atualizar status do lead:", error);
    return NextResponse.json({ error: "Não foi possível atualizar o status" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
