// app/api/diagnostico/route.ts
//
// AJUSTE: se o projeto já tem um client Supabase server-side compartilhado, troque o
// createClient() abaixo por esse client existente.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { diagnosticar } from "@/lib/diagnostico/causas";

const WHATSAPP_SIG = "5511985503734";

const diagnosticoSchema = z.object({
  nome: z.string().trim().min(2, "Informe seu nome").max(120),
  whatsapp: z
    .string()
    .trim()
    .min(10, "WhatsApp inválido")
    .max(20)
    .regex(/^[0-9()+\-\s]+$/, "WhatsApp inválido"),
  tipoNegocio: z.enum(["Bar", "Restaurante", "Café / Cafeteria", "Outro"]),
  faturamentoMensal: z.coerce.number().positive("Informe um valor válido"),
  comprasMensal: z.coerce.number().nonnegative("Informe um valor válido"),
  custoFuncionariosMensal: z.coerce.number().nonnegative("Informe um valor válido"),
  maiorPreocupacao: z.enum([
    "Custo de insumos subindo mais rápido do que consigo repassar",
    "Ticket médio abaixo do que eu gostaria",
    "Não sei exatamente onde estou perdendo dinheiro",
    "Equipe e rotina de trabalho desorganizadas",
  ]),
  desafioLivre: z.string().trim().max(600).optional().or(z.literal("")),
  acreditaConsultor24h: z.enum([
    "Sim, com certeza",
    "Provavelmente sim",
    "Não tenho certeza",
    "Não acredito",
  ]),
  consentimentoLgpd: z.literal(true, {
    errorMap: () => ({ message: "É necessário aceitar o uso dos dados para prosseguir" }),
  }),
  origem: z.string().trim().max(120).optional(),
});

function apenasDigitos(valor: string) {
  return valor.replace(/\D/g, "");
}

function montarLinkWhatsapp(nome: string, causaRaiz: string) {
  const mensagem =
    `Olá! Sou ${nome} e acabei de fazer o diagnóstico grátis do SIG. ` +
    `O resultado apontou: "${causaRaiz}" — quero agendar minha sessão estratégica gratuita.`;
  return `https://wa.me/${WHATSAPP_SIG}?text=${encodeURIComponent(mensagem)}`;
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corpo da requisição inválido" }, { status: 400 });
  }

  const parsed = diagnosticoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", detalhes: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const {
    nome,
    whatsapp,
    tipoNegocio,
    faturamentoMensal,
    comprasMensal,
    custoFuncionariosMensal,
    maiorPreocupacao,
    desafioLivre,
    acreditaConsultor24h,
    origem,
  } = parsed.data;

  // Indicadores, leitura financeira, causa raiz e ação sempre calculados em código.
  const { indicadores, leituraFinanceira, causaRaiz, acaoRecomendada } = diagnosticar({
    tipoNegocio,
    faturamentoMensal,
    comprasMensal,
    custoFuncionariosMensal,
    maiorPreocupacao,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Variáveis de ambiente do Supabase ausentes em /api/diagnostico");
    return NextResponse.json({ error: "Erro de configuração do servidor" }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { error } = await supabase.from("leads_diagnostico").insert({
    nome,
    whatsapp: apenasDigitos(whatsapp),
    tipo_negocio: tipoNegocio,
    faturamento_mensal: faturamentoMensal,
    compras_mensal: comprasMensal,
    custo_funcionarios_mensal: custoFuncionariosMensal,
    cmv_percentual: indicadores.cmvPercentual,
    custo_pessoal_percentual: indicadores.custoPessoalPercentual,
    prime_cost_percentual: indicadores.primeCostPercentual,
    leitura_financeira: leituraFinanceira,
    maior_preocupacao: maiorPreocupacao,
    desafio_livre: desafioLivre || null,
    acredita_consultor_24h: acreditaConsultor24h,
    causa_raiz: causaRaiz,
    acao_recomendada: acaoRecomendada,
    origem: origem ?? null,
    consentimento_lgpd: true,
  });

  if (error) {
    console.error("Erro ao salvar lead do diagnóstico:", error);
    return NextResponse.json({ error: "Não foi possível salvar seu diagnóstico agora" }, { status: 500 });
  }

  return NextResponse.json({
    indicadores,
    leituraFinanceira,
    causaRaiz,
    acaoRecomendada,
    linkWhatsapp: montarLinkWhatsapp(nome, causaRaiz),
  });
}
