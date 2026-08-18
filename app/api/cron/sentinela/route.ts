import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { gerarResumoSentinela } from "@/lib/sentinela-ia";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Roda de manhã pela Vercel (ver vercel.json) e também pode ser
 * disparada à mão pelo admin, no botão "Gerar agora".
 *
 * A Vercel manda o cabeçalho Authorization com o CRON_SECRET quando
 * essa variável existe no projeto. Se ela não estiver configurada,
 * só o admin logado consegue rodar — nunca fica aberto.
 */
async function autorizado(req: Request): Promise<boolean> {
  const segredo = process.env.CRON_SECRET;
  if (segredo) {
    const cabecalho = req.headers.get("authorization");
    if (cabecalho === `Bearer ${segredo}`) return true;
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: admin } = await supabase
    .from("admins_sig")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  return !!admin;
}

async function executar(req: Request) {
  if (!(await autorizado(req))) {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }

  const admin = createAdminClient();

  const fim = new Date();
  const inicio = new Date(fim.getTime() - 24 * 60 * 60 * 1000);
  const referencia = fim.toISOString().slice(0, 10);

  // Os números saem do banco, nunca da IA.
  const { data: linhas, error } = await admin.rpc("sentinela_contar", {
    p_inicio: inicio.toISOString(),
    p_fim: fim.toISOString(),
  });

  if (error) {
    return NextResponse.json(
      { erro: "Falha ao contar os eventos." },
      { status: 500 }
    );
  }

  const contagem = linhas ?? [];
  const total = contagem.reduce(
    (soma: number, l: any) => soma + Number(l.ocorrencias),
    0
  );
  const criticos = contagem
    .filter((l: any) => l.severidade === "critico")
    .reduce((soma: number, l: any) => soma + Number(l.ocorrencias), 0);

  let resumo: string;
  try {
    resumo = await gerarResumoSentinela({
      linhas: contagem as any,
      referencia,
    });
  } catch (e: any) {
    // Se a IA falhar, ainda entregamos os números crus — melhor um
    // relatório seco do que nenhum aviso de que algo quebrou.
    resumo =
      `Não consegui escrever a análise (${e?.message ?? "erro na IA"}), ` +
      `mas foram registradas ${total} falha(s) nas últimas 24 horas. ` +
      `Confira a lista de eventos abaixo.`;
  }

  // Um resumo por dia: se rodar de novo no mesmo dia, atualiza.
  const { error: erroSalvar } = await admin.from("resumos_sentinela").upsert(
    {
      referencia,
      total_eventos: total,
      total_criticos: criticos,
      contagem,
      resumo,
      lido: false,
    },
    { onConflict: "referencia" }
  );

  if (erroSalvar) {
    return NextResponse.json(
      { erro: "Falha ao salvar o resumo." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, total, criticos, referencia });
}

export async function GET(req: Request) {
  return executar(req);
}

export async function POST(req: Request) {
  return executar(req);
}
