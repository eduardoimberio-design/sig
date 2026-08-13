import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { moeda, percentual, primeiroDiaMes, hoje } from "@/lib/formatters";

export const dynamic = "force-dynamic";

const AGENTES = [
  {
    nome: "Financeiro",
    descricao: "Contas, fluxo de caixa e DRE",
    href: "/painel/financeiro",
    disponivel: true,
  },
  {
    nome: "Estoque",
    descricao: "Ficha técnica, CMV e compras",
    href: "/painel/estoque",
    disponivel: true,
  },
  {
    nome: "Marketing",
    descricao: "Conteúdo para redes sociais",
    href: "/painel/marketing",
    disponivel: true,
  },
  {
    nome: "Consultor IA",
    descricao: "Análise dos números, recomendações e plano de ação",
    href: "/painel/consultor",
    disponivel: true,
  },
  {
    nome: "Equipe",
    descricao: "Escala, ausências e treinamentos",
    href: "/painel/equipe",
    disponivel: true,
  },
  {
    nome: "Métricas",
    descricao: "Relatórios por período em Excel e PDF",
    href: "/painel/metricas",
    disponivel: true,
  },
];

export default async function PainelPage() {
  const supabase = createClient();

  const { data: empresa } = await supabase
    .from("minha_empresa")
    .select("*")
    .maybeSingle();

  if (!empresa) redirect("/login");
  if (!empresa.tem_acesso) redirect("/painel/acesso");

  const inicio = primeiroDiaMes();
  const fim = hoje();

  const [
    { data: dre },
    { data: cmvProdutos },
    { data: estoqueBaixo },
    { data: alertas },
    { data: recomendacoes },
    { data: config },
    { data: docsPendentes },
  ] = await Promise.all([
    supabase.rpc("dre_periodo", {
      p_empresa_id: empresa.id,
      p_inicio: inicio,
      p_fim: fim,
    }),
    supabase.rpc("cmv_por_produto", { p_empresa_id: empresa.id }),
    supabase.from("insumos_estoque_baixo").select("nome"),
    supabase
      .from("alertas_financeiros")
      .select("descricao, valor, vencimento, tipo, status, dias_para_vencer")
      .order("vencimento")
      .limit(5),
    supabase
      .from("recomendacoes")
      .select("titulo, categoria, impacto_estimado")
      .eq("status", "pendente")
      .limit(3),
    supabase.from("config_financeiro").select("meta_cmv_percentual").maybeSingle(),
    supabase
      .from("documentos_importados")
      .select("id")
      .eq("status", "aguardando_revisao"),
  ]);

  const metaCmv = Number(config?.meta_cmv_percentual ?? 30);
  const temDadosFinanceiros = dre && Number(dre.receita_bruta) > 0;
  const cmvAcimaDaMeta =
    temDadosFinanceiros && Number(dre.cmv_percentual) > metaCmv;

  const produtosCmvAlto = (cmvProdutos ?? []).filter(
    (p: any) => Number(p.qtd_insumos) > 0 && Number(p.cmv_percentual) > 35
  );

  // Pendências reunidas de todos os módulos — é o que transforma o
  // painel em ponto de partida do dia, em vez de menu de navegação.
  const pendencias: { texto: string; href: string; grave: boolean }[] = [];

  if ((estoqueBaixo?.length ?? 0) > 0) {
    pendencias.push({
      texto: `${estoqueBaixo!.length} insumo${estoqueBaixo!.length === 1 ? "" : "s"} abaixo do estoque mínimo`,
      href: "/painel/estoque",
      grave: true,
    });
  }

  const atrasadas = (alertas ?? []).filter((a) => a.status === "atrasado");
  if (atrasadas.length > 0) {
    pendencias.push({
      texto: `${atrasadas.length} conta${atrasadas.length === 1 ? "" : "s"} em atraso`,
      href: "/painel/financeiro",
      grave: true,
    });
  }

  if ((docsPendentes?.length ?? 0) > 0) {
    pendencias.push({
      texto: `${docsPendentes!.length} documento${docsPendentes!.length === 1 ? "" : "s"} aguardando revisão`,
      href: "/painel/estoque/documentos",
      grave: false,
    });
  }

  if (produtosCmvAlto.length > 0) {
    pendencias.push({
      texto: `${produtosCmvAlto.length} produto${produtosCmvAlto.length === 1 ? "" : "s"} com CMV acima de 35%`,
      href: "/painel/estoque",
      grave: false,
    });
  }

  return (
    <div className="space-y-10">
      <header>
        <h1 className="titulo text-3xl font-semibold">
          Olá, {empresa.nome_usuario.split(" ")[0]}
        </h1>
        <p className="mt-1 text-white/50">
          {temDadosFinanceiros
            ? "Panorama do mês até hoje."
            : "Comece lançando seu faturamento no Agente Financeiro."}
        </p>
      </header>

      {/* Indicadores do mês */}
      {temDadosFinanceiros && (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Indicador rotulo="Faturamento" valor={moeda(dre.receita_bruta)} />
          <Indicador
            rotulo="CMV"
            valor={percentual(dre.cmv_percentual)}
            apoio={`Meta ${percentual(metaCmv)}`}
            alerta={cmvAcimaDaMeta}
          />
          <Indicador rotulo="Ticket médio" valor={moeda(dre.ticket_medio)} />
          <Indicador
            rotulo="Lucro líquido"
            valor={moeda(dre.lucro_liquido)}
            apoio={`Margem ${percentual(dre.margem_liquida)}`}
            alerta={Number(dre.lucro_liquido) < 0}
          />
        </section>
      )}

      {/* Pendências */}
      {pendencias.length > 0 && (
        <section>
          <h2 className="titulo mb-4 text-xl">Precisa da sua atenção</h2>
          <div className="space-y-2">
            {pendencias.map((p) => (
              <Link
                key={p.texto}
                href={p.href}
                className={`flex items-center justify-between border px-4 py-3 text-sm transition-colors ${
                  p.grave
                    ? "border-negativo/40 bg-negativo/5 text-negativo hover:bg-negativo/10"
                    : "border-alerta/40 bg-alerta/5 text-alerta hover:bg-alerta/10"
                }`}
              >
                <span>{p.texto}</span>
                <span className="rotulo opacity-60">Ver →</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Recomendações do Consultor */}
      {recomendacoes && recomendacoes.length > 0 && (
        <section>
          <h2 className="titulo mb-4 text-xl">Recomendações do Consultor</h2>
          <div className="space-y-2">
            {recomendacoes.map((r, i) => (
              <Link
                key={i}
                href="/painel/consultor"
                className="painel flex items-center justify-between gap-4 px-5 py-4 text-sm transition-colors hover:bg-base-raised"
              >
                <span className="text-white/80">{r.titulo}</span>
                {r.impacto_estimado && (
                  <span className="cifra shrink-0 text-ambar">
                    {r.impacto_estimado}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Agentes */}
      <section>
        <h2 className="titulo mb-4 text-xl">Seus agentes</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {AGENTES.map((a) => (
            <Link
              key={a.nome}
              href={a.href}
              className="painel p-5 transition-colors hover:bg-base-raised"
            >
              <p className="titulo text-white">{a.nome}</p>
              <p className="mt-1 text-sm text-white/50">{a.descricao}</p>
              <p className="rotulo mt-4 text-cyan/70">Abrir</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function Indicador({
  rotulo,
  valor,
  apoio,
  alerta,
}: {
  rotulo: string;
  valor: string;
  apoio?: string;
  alerta?: boolean;
}) {
  return (
    <div className="painel p-5">
      <p className="rotulo text-white/40">{rotulo}</p>
      <p
        className={`cifra cifra-halo mt-3 text-2xl ${
          alerta ? "text-negativo" : "text-ambar"
        }`}
      >
        {valor}
      </p>
      {apoio && <p className="mt-1 text-xs text-white/40">{apoio}</p>}
    </div>
  );
}
