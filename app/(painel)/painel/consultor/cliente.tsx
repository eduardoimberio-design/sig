"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import {
  gerarRelatorio,
  marcarRecomendacao,
  type EstadoForm,
} from "@/app/actions/consultor";
import { Alerta } from "@/components/ui";
import { data as fmtData } from "@/lib/formatters";

const estadoInicial: EstadoForm = {};

const ROTULO_CATEGORIA: Record<string, string> = {
  precificacao: "Precificação",
  estoque: "Estoque",
  financeiro: "Financeiro",
  concentracao_gasto: "Fornecedores",
  ticket_medio: "Ticket médio",
};

export function FormGerarRelatorio({
  inicioPadrao,
  fimPadrao,
  habilitado,
}: {
  inicioPadrao: string;
  fimPadrao: string;
  habilitado: boolean;
}) {
  const [estado, acao] = useFormState(gerarRelatorio, estadoInicial);
  const [gerando, setGerando] = useState(false);

  return (
    <form
      action={async (fd) => {
        setGerando(true);
        await acao(fd);
        setGerando(false);
      }}
      className="painel flex flex-wrap items-end gap-4 p-6"
    >
      {estado.erro && (
        <div className="w-full">
          <Alerta tipo="erro">{estado.erro}</Alerta>
        </div>
      )}

      <label className="block">
        <span className="rotulo mb-2 block text-white/45">De</span>
        <input
          type="date"
          name="inicio"
          defaultValue={inicioPadrao}
          className="campo px-3 py-2"
        />
      </label>
      <label className="block">
        <span className="rotulo mb-2 block text-white/45">Até</span>
        <input
          type="date"
          name="fim"
          defaultValue={fimPadrao}
          className="campo px-3 py-2"
        />
      </label>

      <button
        disabled={!habilitado || gerando}
        className="rotulo border border-cyan bg-cyan/10 px-6 py-2.5 text-cyan
                   transition-colors hover:bg-cyan hover:text-base-bg disabled:opacity-40"
      >
        {gerando ? "Analisando..." : "Gerar relatório"}
      </button>

      {gerando && (
        <span className="text-xs text-white/35">
          Isso pode levar até 30 segundos — a IA está lendo seus dados.
        </span>
      )}
    </form>
  );
}

export function ListaRecomendacoes({
  recomendacoes,
}: {
  recomendacoes: {
    id: string;
    categoria: string;
    titulo: string;
    descricao: string;
    impacto_estimado: string | null;
  }[];
}) {
  return (
    <div className="space-y-3">
      {recomendacoes.map((r) => (
        <div key={r.id} className="painel p-5">
          <div className="mb-2 flex items-start justify-between gap-3">
            <div>
              <span className="rotulo text-cyan">
                {ROTULO_CATEGORIA[r.categoria] ?? r.categoria}
              </span>
              <p className="mt-1 text-sm text-white">{r.titulo}</p>
            </div>
            {r.impacto_estimado && (
              <span className="cifra shrink-0 text-ambar">
                {r.impacto_estimado}
              </span>
            )}
          </div>
          <p className="text-sm text-white/60">{r.descricao}</p>

          <div className="mt-3 flex gap-3">
            <form action={marcarRecomendacao}>
              <input type="hidden" name="id" value={r.id} />
              <input type="hidden" name="status" value="aplicada" />
              <button className="rotulo border border-positivo/50 px-3 py-1.5 text-positivo hover:bg-positivo hover:text-base-bg">
                Já apliquei
              </button>
            </form>
            <form action={marcarRecomendacao}>
              <input type="hidden" name="id" value={r.id} />
              <input type="hidden" name="status" value="descartada" />
              <button className="rotulo px-3 py-1.5 text-white/35 hover:text-white/60">
                Descartar
              </button>
            </form>
          </div>
        </div>
      ))}
    </div>
  );
}

export function RelatorioTexto({
  relatorio,
}: {
  relatorio: {
    conteudo: string;
    periodo_inicio: string;
    periodo_fim: string;
    created_at: string;
  };
}) {
  return (
    <div className="painel p-6">
      <p className="rotulo mb-4 text-white/40">
        Período de {fmtData(relatorio.periodo_inicio)} a{" "}
        {fmtData(relatorio.periodo_fim)} · gerado em{" "}
        {new Date(relatorio.created_at).toLocaleDateString("pt-BR")}
      </p>

      <div className="prose-relatorio text-sm leading-relaxed text-white/80">
        {relatorio.conteudo.split("\n").map((linha, i) => {
          if (linha.startsWith("## ")) {
            return (
              <h3 key={i} className="titulo mb-2 mt-5 text-lg text-ambar first:mt-0">
                {linha.replace("## ", "")}
              </h3>
            );
          }
          if (linha.trim() === "") return <div key={i} className="h-2" />;
          if (linha.startsWith("- ")) {
            return (
              <p key={i} className="ml-4 text-white/70">
                • {linha.replace("- ", "")}
              </p>
            );
          }
          return <p key={i}>{linha}</p>;
        })}
      </div>
    </div>
  );
}
