"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import {
  lerFaturamentoDocumento,
  confirmarFaturamentoLido,
  salvarFaturamentoConsolidado,
  type EstadoForm,
} from "@/app/actions/financeiro";
import { Alerta, BotaoSubmit } from "@/components/ui";

const estadoInicial: EstadoForm = {};

type Item = {
  data: string;
  valor: number;
  atendimentos: number | null;
  canal: string | null;
};

function moedaBR(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function ImportarFaturamento() {
  const [aba, setAba] = useState<"documento" | "consolidado">("documento");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <BotaoAba
          ativo={aba === "documento"}
          onClick={() => setAba("documento")}
        >
          Ler de um documento
        </BotaoAba>
        <BotaoAba
          ativo={aba === "consolidado"}
          onClick={() => setAba("consolidado")}
        >
          Digitar total do período
        </BotaoAba>
      </div>

      {aba === "documento" ? <PorDocumento /> : <Consolidado />}
    </div>
  );
}

function BotaoAba({
  ativo,
  onClick,
  children,
}: {
  ativo: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rotulo border px-4 py-2 text-xs transition-colors ${
        ativo
          ? "border-cyan text-cyan"
          : "border-base-border text-white/45 hover:border-cyan/50"
      }`}
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------
// Caminho 1: leitura de documento com confirmação obrigatória
// ---------------------------------------------------------
function PorDocumento() {
  const [estado, acao] = useFormState(lerFaturamentoDocumento, {} as any);
  const [lendo, setLendo] = useState(false);
  const [nome, setNome] = useState<string | null>(null);

  const leitura = estado?.leitura;

  return (
    <div className="space-y-6">
      <form
        action={async (fd) => {
          setLendo(true);
          await acao(fd);
          setLendo(false);
        }}
        className="painel p-6"
      >
        <p className="rotulo mb-1 text-cyan">Relatório de vendas</p>
        <p className="mb-5 text-sm text-white/45">
          Envie o relatório do seu sistema de vendas. A leitura é conferida por
          você antes de virar lançamento.
        </p>

        {estado?.erro && (
          <div className="mb-4">
            <Alerta tipo="erro">{estado.erro}</Alerta>
          </div>
        )}

        <label
          htmlFor="arquivo-faturamento"
          className="flex cursor-pointer flex-col items-center justify-center border
                     border-dashed border-base-border px-6 py-8 text-center
                     transition-colors hover:border-cyan"
        >
          <span className="rotulo text-cyan">
            {nome ?? "Clique para selecionar"}
          </span>
          <span className="mt-2 text-xs text-white/35">
            PDF, JPG, PNG ou WEBP
          </span>
          <input
            id="arquivo-faturamento"
            name="arquivo"
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp"
            className="hidden"
            onChange={(e) => setNome(e.target.files?.[0]?.name ?? null)}
          />
        </label>

        <label className="mt-4 block">
          <span className="rotulo mb-2 block text-white/45">
            O que é este relatório (opcional)
          </span>
          <input
            name="descricao"
            placeholder="Ex.: vendas de agosto, sistema do PDV"
            className="campo w-full px-4 py-2.5 text-sm placeholder-white/25"
          />
        </label>

        <div className="mt-4">
          <BotaoSubmit>{lendo ? "Lendo…" : "Ler documento"}</BotaoSubmit>
        </div>
      </form>

      {leitura && <ConfirmarLeitura leitura={leitura} />}
    </div>
  );
}

function ConfirmarLeitura({ leitura }: { leitura: any }) {
  const [itens, setItens] = useState<Item[]>(leitura.itens ?? []);
  const [estado, acao] = useFormState(confirmarFaturamentoLido, estadoInicial);

  const somaItens = itens.reduce((s, i) => s + Number(i.valor || 0), 0);
  const total = leitura.total_declarado;

  // Só o total do mês, sem quebra por dia: o caminho certo é o
  // consolidado, não inventar distribuição entre os dias.
  if (itens.length === 0) {
    return (
      <div className="painel border-alerta/40 p-6">
        <p className="rotulo mb-3 text-alerta">Leitura parcial</p>
        <p className="text-sm leading-relaxed text-white/70">
          {total
            ? `O documento traz apenas um total de ${moedaBR(total)}, sem detalhamento por dia.`
            : "Não encontrei faturamento com data neste documento."}{" "}
          {leitura.observacao ? `${leitura.observacao} ` : ""}
          Não vou dividir esse valor entre os dias, porque isso inventaria
          venda em dia que talvez não teve.
        </p>
        <p className="mt-3 text-sm text-white/55">
          Use a aba <strong className="text-cyan">Digitar total do período</strong>{" "}
          e informe esse valor com a data inicial e final que ele cobre.
        </p>
      </div>
    );
  }

  return (
    <div className="painel p-6">
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <p className="rotulo text-cyan">Confira antes de registrar</p>
        <span className="text-xs text-white/35">
          {itens.length} dia(s) · {moedaBR(somaItens)}
        </span>
      </div>

      {total !== null && Math.abs(total - somaItens) > 0.5 && (
        <div className="mb-4 border-l-2 border-alerta bg-alerta/5 py-3 pl-4 pr-3">
          <p className="text-sm text-alerta">
            A soma dos dias ({moedaBR(somaItens)}) não bate com o total do
            relatório ({moedaBR(total)}). Confira antes de registrar.
          </p>
        </div>
      )}

      {leitura.observacao && (
        <p className="mb-4 text-sm text-white/45">{leitura.observacao}</p>
      )}

      {estado.erro && (
        <div className="mb-4">
          <Alerta tipo="erro">{estado.erro}</Alerta>
        </div>
      )}
      {estado.sucesso && (
        <div className="mb-4">
          <Alerta tipo="sucesso">{estado.sucesso}</Alerta>
        </div>
      )}

      <div className="space-y-2">
        {itens.map((item, i) => (
          <div
            key={i}
            className="grid items-center gap-3 border border-base-border p-3 sm:grid-cols-4"
          >
            <input
              type="date"
              value={item.data}
              onChange={(e) => {
                const copia = [...itens];
                copia[i] = { ...item, data: e.target.value };
                setItens(copia);
              }}
              className="campo px-3 py-2 text-sm"
            />
            <input
              value={item.valor}
              onChange={(e) => {
                const copia = [...itens];
                copia[i] = { ...item, valor: Number(e.target.value) || 0 };
                setItens(copia);
              }}
              className="campo px-3 py-2 text-sm"
            />
            <input
              value={item.atendimentos ?? ""}
              placeholder="atendimentos"
              onChange={(e) => {
                const copia = [...itens];
                copia[i] = {
                  ...item,
                  atendimentos: e.target.value ? Number(e.target.value) : null,
                };
                setItens(copia);
              }}
              className="campo px-3 py-2 text-sm placeholder-white/20"
            />
            <div className="flex items-center gap-2">
              <input
                value={item.canal ?? ""}
                placeholder="canal"
                onChange={(e) => {
                  const copia = [...itens];
                  copia[i] = { ...item, canal: e.target.value || null };
                  setItens(copia);
                }}
                className="campo flex-1 px-3 py-2 text-sm placeholder-white/20"
              />
              <button
                type="button"
                onClick={() => setItens(itens.filter((_, j) => j !== i))}
                className="text-xs text-white/30 hover:text-negativo"
                aria-label="Remover linha"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>

      <form action={acao} className="mt-5">
        <input type="hidden" name="itens" value={JSON.stringify(itens)} />
        <BotaoSubmit>Registrar {itens.length} lançamento(s)</BotaoSubmit>
      </form>
    </div>
  );
}

// ---------------------------------------------------------
// Caminho 2: o usuário informa o total do período
// ---------------------------------------------------------
function Consolidado() {
  const [estado, acao] = useFormState(
    salvarFaturamentoConsolidado,
    estadoInicial
  );

  return (
    <form action={acao} className="painel p-6">
      <p className="rotulo mb-1 text-cyan">Total do período</p>
      <p className="mb-5 text-sm text-white/45">
        Para quem só tem o total do mês. Registra uma linha cobrindo o período
        inteiro, sem fingir que a venda aconteceu num dia só.
      </p>

      {estado.erro && (
        <div className="mb-4">
          <Alerta tipo="erro">{estado.erro}</Alerta>
        </div>
      )}
      {estado.sucesso && (
        <div className="mb-4">
          <Alerta tipo="sucesso">{estado.sucesso}</Alerta>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="rotulo mb-2 block text-white/45">De</span>
          <input
            name="inicio"
            type="date"
            required
            className="campo w-full px-4 py-2.5 text-sm"
          />
        </label>
        <label className="block">
          <span className="rotulo mb-2 block text-white/45">Até</span>
          <input
            name="fim"
            type="date"
            required
            className="campo w-full px-4 py-2.5 text-sm"
          />
        </label>
        <label className="block">
          <span className="rotulo mb-2 block text-white/45">
            Faturamento do período (R$)
          </span>
          <input
            name="valor"
            placeholder="86.436,81"
            required
            className="campo w-full px-4 py-2.5 text-sm placeholder-white/25"
          />
        </label>
        <label className="block">
          <span className="rotulo mb-2 block text-white/45">
            Atendimentos (opcional)
          </span>
          <input
            name="num_atendimentos"
            type="number"
            min={0}
            placeholder="0"
            className="campo w-full px-4 py-2.5 text-sm placeholder-white/25"
          />
        </label>
      </div>

      <p className="mt-3 text-xs text-white/30">
        Sem o número de atendimentos o ticket médio fica zerado — é preferível
        a um ticket inventado.
      </p>

      <div className="mt-4">
        <BotaoSubmit>Registrar faturamento</BotaoSubmit>
      </div>
    </form>
  );
}
