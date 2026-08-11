"use client";

import { useState } from "react";
import { moeda, percentual } from "@/lib/formatters";

export interface ItemPareto {
  nome: string;
  valor: number;
}

/**
 * Diagrama de Pareto de gastos.
 *
 * A leitura útil não é "quem é o maior fornecedor" — é "quais poucos
 * concentram a maior parte do dinheiro". Só nesses a negociação tem
 * efeito material. Por isso o corte dos 80% é destacado visualmente.
 */
export function Pareto({
  itens,
  titulo,
  vazio,
}: {
  itens: ItemPareto[];
  titulo: string;
  vazio: string;
}) {
  const [foco, setFoco] = useState<number | null>(null);

  if (!itens.length) {
    return (
      <div className="painel p-6">
        <p className="text-sm text-white/45">{vazio}</p>
      </div>
    );
  }

  const total = itens.reduce((s, i) => s + Number(i.valor), 0);
  const maior = Number(itens[0].valor) || 1;

  let acumulado = 0;
  const linhas = itens.map((item) => {
    const valor = Number(item.valor);
    acumulado += valor;
    return {
      ...item,
      valor,
      participacao: (valor / total) * 100,
      acumuladoPct: (acumulado / total) * 100,
      alturaRelativa: (valor / maior) * 100,
    };
  });

  // Quantos itens bastam para chegar a 80% do gasto
  const indiceCorte = linhas.findIndex((l) => l.acumuladoPct >= 80);
  const itensVitais = indiceCorte >= 0 ? indiceCorte + 1 : linhas.length;
  const pctItensVitais = (itensVitais / linhas.length) * 100;

  return (
    <div className="painel p-6">
      <p className="rotulo mb-1 text-white/40">{titulo}</p>

      <p className="mb-6 text-sm leading-relaxed text-white/60">
        <span className="cifra text-ambar">{itensVitais}</span> de{" "}
        <span className="cifra">{linhas.length}</span>{" "}
        {linhas.length === 1 ? "item concentra" : "itens concentram"} 80% do
        gasto do período
        {linhas.length > 2 && (
          <>
            {" "}
            — <span className="cifra">{percentual(pctItensVitais)}</span> do
            total. É neles que negociação muda o resultado.
          </>
        )}
      </p>

      <div className="space-y-2.5">
        {linhas.map((l, i) => {
          const vital = i < itensVitais;
          return (
            <div
              key={l.nome + i}
              onMouseEnter={() => setFoco(i)}
              onMouseLeave={() => setFoco(null)}
              className="group"
            >
              <div className="mb-1 flex items-baseline justify-between gap-4 text-sm">
                <span
                  className={`truncate ${vital ? "text-white" : "text-white/45"}`}
                >
                  {l.nome}
                </span>
                <span className="flex shrink-0 items-baseline gap-3">
                  <span className="cifra text-xs text-white/40">
                    {percentual(l.participacao)}
                  </span>
                  <span
                    className={`cifra ${vital ? "text-ambar" : "text-white/50"}`}
                  >
                    {moeda(l.valor)}
                  </span>
                </span>
              </div>

              {/* Barra do valor + marca do acumulado */}
              <div className="relative h-2 bg-white/[0.04]">
                <div
                  className="h-full transition-opacity"
                  style={{
                    width: `${l.alturaRelativa}%`,
                    backgroundColor: vital ? "#D9A94C" : "#1E3350",
                    opacity: foco === null || foco === i ? 1 : 0.45,
                  }}
                />
                <div
                  className="absolute top-0 h-full w-px bg-cyan/70"
                  style={{ left: `${l.acumuladoPct}%` }}
                  title={`Acumulado: ${percentual(l.acumuladoPct)}`}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="regua my-5" />

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-white/35">
        <span className="flex items-center gap-2">
          <span className="inline-block h-2 w-4 bg-ambar" />
          Concentram 80% do gasto
        </span>
        <span className="flex items-center gap-2">
          <span className="inline-block h-3 w-px bg-cyan/70" />
          Linha do acumulado
        </span>
        <span className="ml-auto">
          Total: <span className="cifra text-white/60">{moeda(total)}</span>
        </span>
      </div>
    </div>
  );
}
