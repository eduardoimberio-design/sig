import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { moeda } from "@/lib/formatters";
import { StatusLeadSelect } from "./cliente";

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

function fmtDataHora(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function DiagnosticosAdminPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: admin } = await supabase
    .from("admins_sig")
    .select("nome")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!admin) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <div className="painel max-w-md p-8 text-center">
          <p className="rotulo text-negativo">Acesso restrito</p>
          <p className="mt-3 text-sm text-white/60">
            Esta área é exclusiva para administradores do SIG.
          </p>
          <a
            href="/painel"
            className="rotulo mt-6 inline-block border border-cyan bg-cyan/10 px-5 py-2.5 text-cyan hover:bg-cyan hover:text-base-bg"
          >
            Voltar ao painel
          </a>
        </div>
      </main>
    );
  }

  const { data: leadsData, error } = await supabase.rpc("admin_listar_leads_diagnostico");
  const leads = (leadsData ?? []) as LeadDiagnostico[];

  const statusFiltro = searchParams?.status;
  const leadsFiltrados =
    statusFiltro && TODOS_STATUS.includes(statusFiltro as StatusLead)
      ? leads.filter((l) => l.status === statusFiltro)
      : leads;

  return (
    <div className="min-h-screen">
      <header className="border-b border-base-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-baseline gap-3">
            <span className="titulo text-xl font-semibold text-ambar">SIG</span>
            <span className="rotulo text-cyan">Leads do Diagnóstico</span>
          </div>
          <a href="/admin" className="text-sm text-white/50 hover:text-white/80">
            ← Voltar ao painel admin
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-6 py-10">
        {error && (
          <div className="painel border-alerta/40 p-5">
            <p className="rotulo text-alerta">Erro ao carregar leads</p>
            <p className="mt-2 text-sm text-white/60">{error.message}</p>
          </div>
        )}

        {/* filtros por status */}
        <div className="flex flex-wrap gap-2">
          <FiltroLink status={undefined} atual={statusFiltro} label="Todos" />
          {TODOS_STATUS.map((s) => (
            <FiltroLink key={s} status={s} atual={statusFiltro} label={STATUS_LABEL[s]} />
          ))}
        </div>

        {leadsFiltrados.length === 0 ? (
          <p className="text-sm text-white/45">Nenhum lead encontrado para esse filtro.</p>
        ) : (
          <div className="painel overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="rotulo border-b border-base-border text-left text-white/40">
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
                {leadsFiltrados.map((lead) => (
                  <tr key={lead.id} className="border-b border-base-border/60 align-top">
                    <td className="px-4 py-3">
                      <div className="font-medium text-white">{lead.nome}</div>
                      <a
                        href={`https://wa.me/55${lead.whatsapp}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-cyan"
                      >
                        {lead.whatsapp}
                      </a>
                      {lead.desafio_livre && (
                        <p className="mt-1 max-w-xs text-xs text-white/40">"{lead.desafio_livre}"</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-white/70">{lead.tipo_negocio}</td>
                    <td className="px-4 py-3 cifra text-ambar">
                      {lead.faturamento_mensal ? moeda(lead.faturamento_mensal) : "—"}
                    </td>
                    <td className="px-4 py-3 text-white/70">{fmtPct(lead.cmv_percentual)}</td>
                    <td className="px-4 py-3 text-white/70">{fmtPct(lead.custo_pessoal_percentual)}</td>
                    <td className="px-4 py-3 font-medium text-white">{fmtPct(lead.prime_cost_percentual)}</td>
                    <td className="px-4 py-3 max-w-[220px] text-xs text-white/50">
                      {lead.maior_preocupacao ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-white/70">{lead.acredita_consultor_24h ?? "—"}</td>
                    <td className="px-4 py-3">
                      <StatusLeadSelect leadId={lead.id} statusAtual={lead.status} opcoes={STATUS_LABEL} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-white/40">
                      {fmtDataHora(lead.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
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
      className={`rotulo px-3 py-1.5 border text-xs ${
        ativo
          ? "border-cyan bg-cyan/10 text-cyan"
          : "border-base-border text-white/45 hover:text-white/70"
      }`}
    >
      {label}
    </a>
  );
}
