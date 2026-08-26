// app/admin/diagnosticos/page.tsx
//
// AJUSTE NECESSÁRIO: esta página assume que já existe um app/admin/layout.tsx (ou
// middleware) que verifica a sessão de admin antes de renderizar qualquer página sob
// /admin — é o padrão que o resto do painel administrativo do SIG já deve seguir.
// Se não existir, adicione aqui a mesma checagem de autenticação usada em
// /admin/suporte antes de liberar o acesso a esta página.
//
// Esta página busca os dados diretamente no servidor com a service role key (por
// isso não depende de nenhuma policy de RLS pra admin) — não expõe a service role
// key ao client em nenhum momento.

import { createClient } from "@supabase/supabase-js";
import { StatusSelect } from "./StatusSelect";

export const dynamic = "force-dynamic";

type StatusLead =
  | "novo"
  | "contatado"
  | "em_conversa"
  | "sessao_agendada"
  | "proposta"
  | "fechado"
  | "perdido";

const STATUS_LABEL: Record<StatusLead, string> = {
  novo: "Novo",
  contatado: "Contatado",
  em_conversa: "Em conversa",
  sessao_agendada: "Sessão agendada",
  proposta: "Proposta",
  fechado: "Fechado",
  perdido: "Perdido",
};

const TODOS_STATUS: StatusLead[] = [
  "novo",
  "contatado",
  "em_conversa",
  "sessao_agendada",
  "proposta",
  "fechado",
  "perdido",
];

interface LeadDiagnostico {
  id: string;
  nome: string;
  whatsapp: string;
  tipo_negocio: string;
  faturamento_mensal: number | null;
  cmv_percentual: number | null;
  custo_pessoal_percentual: number | null;
  prime_cost_percentual: number | null;
  maior_preocupacao: string | null;
  desafio_livre: string | null;
  acredita_consultor_24h: string | null;
  status: StatusLead;
  created_at: string;
}

function fmtPct(valor: number | null | undefined) {
  if (valor === null || valor === undefined) return "—";
  return valor.toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + "%";
}

function fmtMoeda(valor: number | null | undefined) {
  if (valor === null || valor === undefined) return "—";
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

function fmtData(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function buscarLeads(statusFiltro?: string): Promise<LeadDiagnostico[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Variáveis de ambiente do Supabase ausentes");
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  let query = supabase
    .from("leads_diagnostico")
    .select(
      "id, nome, whatsapp, tipo_negocio, faturamento_mensal, cmv_percentual, custo_pessoal_percentual, prime_cost_percentual, maior_preocupacao, desafio_livre, acredita_consultor_24h, status, created_at"
    )
    .order("created_at", { ascending: false });

  if (statusFiltro && TODOS_STATUS.includes(statusFiltro as StatusLead)) {
    query = query.eq("status", statusFiltro);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as LeadDiagnostico[];
}

export default async function DiagnosticosAdminPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const statusFiltro = searchParams?.status;
  const leads = await buscarLeads(statusFiltro);

  return (
    <div className="min-h-screen bg-[#050B14] text-[#E8EEF3] p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <span
            style={{ fontFamily: "IBM Plex Mono, monospace" }}
            className="block text-[11px] tracking-[0.14em] uppercase text-[#4EC5DC] mb-2"
          >
            Painel administrativo · SIG
          </span>
          <h1 style={{ fontFamily: "Space Grotesk, sans-serif" }} className="text-2xl font-bold">
            Leads do Diagnóstico Grátis
          </h1>
        </div>

        {/* filtros por status */}
        <div className="flex flex-wrap gap-2 mb-6">
          <FiltroLink status={undefined} atual={statusFiltro} label="Todos" />
          {TODOS_STATUS.map((s) => (
            <FiltroLink key={s} status={s} atual={statusFiltro} label={STATUS_LABEL[s]} />
          ))}
        </div>

        {leads.length === 0 ? (
          <p className="text-[#8FA3B3] text-sm">Nenhum lead encontrado para esse filtro.</p>
        ) : (
          <div className="border border-[#4EC5DC]/20 rounded-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr
                  style={{ fontFamily: "IBM Plex Mono, monospace" }}
                  className="text-left text-[11px] uppercase text-[#8FA3B3] border-b border-[#4EC5DC]/20"
                >
                  <th className="px-4 py-3">Lead</th>
                  <th className="px-4 py-3">Negócio</th>
                  <th className="px-4 py-3">Faturamento</th>
                  <th className="px-4 py-3">CMV</th>
                  <th className="px-4 py-3">Pessoal</th>
                  <th className="px-4 py-3">Prime Cost</th>
                  <th className="px-4 py-3">Preocupação</th>
                  <th className="px-4 py-3">Consultor 24h?</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Recebido em</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.id} className="border-b border-[#4EC5DC]/10 align-top">
                    <td className="px-4 py-3">
                      <div className="font-medium">{lead.nome}</div>
                      <a
                        href={`https://wa.me/55${lead.whatsapp}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#4EC5DC] text-xs"
                      >
                        {lead.whatsapp}
                      </a>
                      {lead.desafio_livre && (
                        <p className="text-[#8FA3B3] text-xs mt-1 max-w-xs">"{lead.desafio_livre}"</p>
                      )}
                    </td>
                    <td className="px-4 py-3">{lead.tipo_negocio}</td>
                    <td className="px-4 py-3 text-[#D9A94C]">{fmtMoeda(lead.faturamento_mensal)}</td>
                    <td className="px-4 py-3">{fmtPct(lead.cmv_percentual)}</td>
                    <td className="px-4 py-3">{fmtPct(lead.custo_pessoal_percentual)}</td>
                    <td className="px-4 py-3 font-medium">{fmtPct(lead.prime_cost_percentual)}</td>
                    <td className="px-4 py-3 max-w-[220px] text-xs text-[#8FA3B3]">
                      {lead.maior_preocupacao ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-xs">{lead.acredita_consultor_24h ?? "—"}</td>
                    <td className="px-4 py-3">
                      <StatusSelect leadId={lead.id} statusAtual={lead.status} opcoes={STATUS_LABEL} />
                    </td>
                    <td className="px-4 py-3 text-xs text-[#8FA3B3] whitespace-nowrap">
                      {fmtData(lead.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function FiltroLink({
  status,
  atual,
  label,
}: {
  status: string | undefined;
  atual: string | undefined;
  label: string;
}) {
  const ativo = status === atual || (!status && !atual);
  const href = status ? `/admin/diagnosticos?status=${status}` : "/admin/diagnosticos";
  return (
    <a
      href={href}
      style={{ fontFamily: "IBM Plex Mono, monospace" }}
      className={`text-xs px-3 py-1.5 rounded-sm border ${
        ativo
          ? "bg-[#4EC5DC] text-[#04121A] border-[#4EC5DC] font-medium"
          : "border-[#4EC5DC]/20 text-[#8FA3B3]"
      }`}
    >
      {label}
    </a>
  );
}
