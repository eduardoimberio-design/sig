"use client";

import { useState } from "react";
import { coletarDadosRelatorio, type DadosRelatorio } from "@/app/actions/metricas";
import { gerarExcel, gerarPDF } from "@/lib/exportadores";
import { Alerta } from "@/components/ui";
import { moeda, percentual, data as fmtData } from "@/lib/formatters";

function iso(d: Date) {
  return d.toISOString().slice(0, 10);
}

function periodosRapidos() {
  const hoje = new Date();
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const inicioMesPassado = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
  const fimMesPassado = new Date(hoje.getFullYear(), hoje.getMonth(), 0);
  const ultimos30 = new Date(hoje);
  ultimos30.setDate(ultimos30.getDate() - 30);
  const ultimos90 = new Date(hoje);
  ultimos90.setDate(ultimos90.getDate() - 90);
  const inicioAno = new Date(hoje.getFullYear(), 0, 1);

  return [
    { rotulo: "Este mês", inicio: iso(inicioMes), fim: iso(hoje) },
    { rotulo: "Mês passado", inicio: iso(inicioMesPassado), fim: iso(fimMesPassado) },
    { rotulo: "Últimos 30 dias", inicio: iso(ultimos30), fim: iso(hoje) },
    { rotulo: "Últimos 90 dias", inicio: iso(ultimos90), fim: iso(hoje) },
    { rotulo: "Este ano", inicio: iso(inicioAno), fim: iso(hoje) },
  ];
}

export function PainelMetricas({
  primeiroLancamento,
  ultimoLancamento,
}: {
  primeiroLancamento: string | null;
  ultimoLancamento: string | null;
}) {
  const atalhos = periodosRapidos();
  const [inicio, setInicio] = useState(atalhos[0].inicio);
  const [fim, setFim] = useState(atalhos[0].fim);
  const [dados, setDados] = useState<DadosRelatorio | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function buscar(i = inicio, f = fim) {
    setCarregando(true);
    setErro(null);
    setDados(null);

    const resultado = await coletarDadosRelatorio(i, f);

    if ("erro" in resultado) {
      setErro(resultado.erro);
    } else {
      setDados(resultado);
    }
    setCarregando(false);
  }

  function aplicarAtalho(a: { inicio: string; fim: string }) {
    setInicio(a.inicio);
    setFim(a.fim);
    buscar(a.inicio, a.fim);
  }

  // Avisa quando o período pedido é anterior ao histórico existente
  const periodoAnteriorAoHistorico =
    primeiroLancamento && fim < primeiroLancamento;

  return (
    <div className="space-y-6">
      <div className="painel space-y-4 p-6">
        <div>
          <p className="rotulo mb-3 text-white/45">Períodos rápidos</p>
          <div className="flex flex-wrap gap-2">
            {atalhos.map((a) => {
              const ativo = a.inicio === inicio && a.fim === fim;
              return (
                <button
                  key={a.rotulo}
                  onClick={() => aplicarAtalho(a)}
                  className={`rotulo border px-3 py-2 transition-colors ${
                    ativo
                      ? "border-cyan bg-cyan/10 text-cyan"
                      : "border-base-border text-white/45 hover:text-white/75"
                  }`}
                >
                  {a.rotulo}
                </button>
              );
            })}
          </div>
        </div>

        <div className="regua" />

        <div className="flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="rotulo mb-2 block text-white/45">De</span>
            <input
              type="date"
              value={inicio}
              onChange={(e) => setInicio(e.target.value)}
              className="campo px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="rotulo mb-2 block text-white/45">Até</span>
            <input
              type="date"
              value={fim}
              onChange={(e) => setFim(e.target.value)}
              className="campo px-3 py-2 text-sm"
            />
          </label>
          <button
            onClick={() => buscar()}
            disabled={carregando}
            className="rotulo border border-cyan bg-cyan/10 px-5 py-2.5 text-cyan transition-colors hover:bg-cyan hover:text-base-bg disabled:opacity-40"
          >
            {carregando ? "Buscando..." : "Gerar relatório"}
          </button>
        </div>

        {primeiroLancamento && (
          <p className="text-xs text-white/35">
            Seu histórico começa em {fmtData(primeiroLancamento)}
            {ultimoLancamento && ` e vai até ${fmtData(ultimoLancamento)}`}.
          </p>
        )}
      </div>

      {erro && <Alerta tipo="erro">{erro}</Alerta>}

      {periodoAnteriorAoHistorico && (
        <div className="border-l-4 border border-alerta/40 bg-alerta/10 px-4 py-3 text-sm text-alerta">
          O período escolhido é anterior ao seu primeiro lançamento no sistema
          — não há dado a relatar aí.
        </div>
      )}

      {dados && <Resultado dados={dados} />}
    </div>
  );
}

function Resultado({ dados }: { dados: DadosRelatorio }) {
  const [exportando, setExportando] = useState<string | null>(null);
  const d = dados.dre;

  if (!dados.temDados) {
    return (
      <div className="painel p-8 text-center">
        <p className="titulo text-lg text-ambar">
          Nenhum lançamento neste período
        </p>
        <p className="mx-auto mt-2 max-w-md text-sm text-white/50">
          Não há vendas nem contas registradas entre{" "}
          {fmtData(dados.periodo.inicio)} e {fmtData(dados.periodo.fim)}.
          Escolha outro período ou lance os dados no Agente Financeiro.
        </p>
      </div>
    );
  }

  function exportar(formato: "excel" | "pdf") {
    setExportando(formato);
    try {
      if (formato === "excel") gerarExcel(dados);
      else gerarPDF(dados);
    } finally {
      setTimeout(() => setExportando(null), 800);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-white/50">
          {fmtData(dados.periodo.inicio)} a {fmtData(dados.periodo.fim)} ·{" "}
          {dados.vendasDiarias.length} dia
          {dados.vendasDiarias.length === 1 ? "" : "s"} com lançamento
        </p>

        <div className="flex gap-3">
          <button
            onClick={() => exportar("excel")}
            className="rotulo border border-positivo/50 bg-positivo/10 px-4 py-2 text-positivo transition-colors hover:bg-positivo hover:text-base-bg"
          >
            {exportando === "excel" ? "Gerando..." : "Baixar Excel"}
          </button>
          <button
            onClick={() => exportar("pdf")}
            className="rotulo border border-ambar/50 bg-ambar/10 px-4 py-2 text-ambar transition-colors hover:bg-ambar hover:text-base-bg"
          >
            {exportando === "pdf" ? "Gerando..." : "Baixar PDF"}
          </button>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Indicador rotulo="Faturamento" valor={moeda(d?.receita_bruta)} />
        <Indicador rotulo="CMV" valor={percentual(d?.cmv_percentual)} />
        <Indicador rotulo="Ticket médio" valor={moeda(d?.ticket_medio)} />
        <Indicador
          rotulo="Lucro líquido"
          valor={moeda(d?.lucro_liquido)}
          apoio={`Margem ${percentual(d?.margem_liquida)}`}
          alerta={Number(d?.lucro_liquido) < 0}
        />
      </section>

      <section className="painel overflow-hidden">
        <table className="w-full text-sm">
          <tbody>
            {[
              ["Receita bruta", d?.receita_bruta, false],
              ["(−) Impostos", -Number(d?.impostos ?? 0), false],
              ["Receita líquida", d?.receita_liquida, true],
              ["(−) Insumos (CMV)", -Number(d?.cmv ?? 0), false],
              ["Lucro bruto", d?.lucro_bruto, true],
              ["(−) Pessoal", -Number(d?.pessoal ?? 0), false],
              ["(−) Despesas fixas", -Number(d?.despesa_fixa ?? 0), false],
              ["(−) Despesas variáveis", -Number(d?.despesa_variavel ?? 0), false],
              ["Resultado operacional", d?.resultado_operacional, true],
              ["(−) Despesas financeiras", -Number(d?.despesa_financeira ?? 0), false],
              ["Lucro líquido", d?.lucro_liquido, true],
            ].map(([rotulo, valor, destaque]: any, i) => (
              <tr
                key={i}
                className={`border-b border-base-border last:border-0 ${
                  destaque ? "bg-white/[0.03]" : ""
                }`}
              >
                <td className={`px-4 py-2.5 ${destaque ? "font-medium" : "text-white/65"}`}>
                  {rotulo}
                </td>
                <td
                  className={`cifra px-4 py-2.5 text-right ${
                    Number(valor) < 0 ? "text-white/45" : "text-white"
                  }`}
                >
                  {moeda(valor)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
