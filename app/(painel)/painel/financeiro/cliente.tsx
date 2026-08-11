"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import {
  salvarContaPagar,
  salvarContaReceber,
  salvarVenda,
  type EstadoForm,
} from "@/app/actions/financeiro";
import { Campo, BotaoSubmit, Alerta } from "@/components/ui";
import { moeda, GRUPOS_DRE, hoje } from "@/lib/formatters";

const estadoInicial: EstadoForm = {};

interface PontoFluxo {
  dia: string;
  entradas: number;
  saidas: number;
  saldo_dia: number;
  saldo_acumulado: number;
}

export function GraficoFluxo({ dados }: { dados: PontoFluxo[] }) {
  const [foco, setFoco] = useState<number | null>(null);

  const saldos = dados.map((d) => Number(d.saldo_acumulado));
  const max = Math.max(...saldos, 0);
  const min = Math.min(...saldos, 0);
  const amplitude = max - min || 1;

  const saldoFinal = saldos[saldos.length - 1] ?? 0;
  const totalEntradas = dados.reduce((s, d) => s + Number(d.entradas), 0);
  const totalSaidas = dados.reduce((s, d) => s + Number(d.saidas), 0);
  const ponto = foco !== null ? dados[foco] : null;

  return (
    <div className="painel p-6">
      <div className="mb-6 flex flex-wrap gap-8 text-sm">
        <div>
          <p className="rotulo text-white/40">Entradas</p>
          <p className="cifra mt-1 text-ambar">{moeda(totalEntradas)}</p>
        </div>
        <div>
          <p className="rotulo text-white/40">Saídas</p>
          <p className="cifra mt-1 text-white/70">{moeda(totalSaidas)}</p>
        </div>
        <div>
          <p className="rotulo text-white/40">
            Saldo do período
          </p>
          <p className={`cifra mt-1 ${saldoFinal < 0 ? "text-negativo" : "text-positivo"}`}>
            {moeda(saldoFinal)}
          </p>
        </div>
      </div>

      {/* Barras do saldo acumulado — a linha do zero fica visível
          para deixar claro quando o caixa vira negativo. */}
      <div
        className="relative flex h-40 items-end gap-[2px]"
        onMouseLeave={() => setFoco(null)}
      >
        {min < 0 && (
          <div
            className="absolute left-0 right-0 border-t border-dashed border-white/20"
            style={{ bottom: `${((0 - min) / amplitude) * 100}%` }}
            aria-hidden
          />
        )}

        {dados.map((d, i) => {
          const v = Number(d.saldo_acumulado);
          const altura = (Math.abs(v) / amplitude) * 100;
          const base = ((Math.min(v, 0) - min) / amplitude) * 100;
          return (
            <button
              key={d.dia}
              onMouseEnter={() => setFoco(i)}
              onFocus={() => setFoco(i)}
              className="relative flex-1 rounded-t-[1px] outline-none"
              style={{
                height: `${Math.max(altura, 1)}%`,
                marginBottom: `${base}%`,
                backgroundColor: v < 0 ? "#FF6B7A" : "#4EC5DC",
                opacity: foco === null || foco === i ? 1 : 0.4,
              }}
              aria-label={`${d.dia}: ${moeda(v)}`}
            />
          );
        })}
      </div>

      <div className="mt-3 flex h-5 items-center justify-between text-xs text-white/40">
        {ponto ? (
          <span className="text-white/70">
            {new Date(ponto.dia + "T00:00:00").toLocaleDateString("pt-BR")} ·
            entrada {moeda(ponto.entradas)} · saída {moeda(ponto.saidas)} ·
            saldo {moeda(ponto.saldo_acumulado)}
          </span>
        ) : (
          <>
            <span>
              {new Date(dados[0].dia + "T00:00:00").toLocaleDateString("pt-BR")}
            </span>
            <span>
              {new Date(
                dados[dados.length - 1].dia + "T00:00:00"
              ).toLocaleDateString("pt-BR")}
            </span>
          </>
        )}
      </div>
    </div>
  );
}

type Aba = "venda" | "pagar" | "receber";

export function PainelLancamentos() {
  const [aba, setAba] = useState<Aba>("venda");

  const abas: { id: Aba; rotulo: string }[] = [
    { id: "venda", rotulo: "Faturamento do dia" },
    { id: "pagar", rotulo: "Conta a pagar" },
    { id: "receber", rotulo: "Conta a receber" },
  ];

  return (
    <section>
      <h2 className="titulo mb-4 text-xl">Novo lançamento</h2>

      <div className="mb-5 flex flex-wrap gap-2">
        {abas.map((a) => (
          <button
            key={a.id}
            onClick={() => setAba(a.id)}
            className={`rotulo border px-4 py-2.5 transition-colors ${
              aba === a.id
                ? "border-cyan bg-cyan/10 text-cyan"
                : "border-base-border text-white/50 hover:text-white/80"
            }`}
          >
            {a.rotulo}
          </button>
        ))}
      </div>

      <div className="painel p-6">
        {aba === "venda" && <FormVenda />}
        {aba === "pagar" && <FormPagar />}
        {aba === "receber" && <FormReceber />}
      </div>
    </section>
  );
}

function FormVenda() {
  const [estado, acao] = useFormState(salvarVenda, estadoInicial);

  return (
    <form action={acao} className="space-y-4">
      {estado.erro && <Alerta tipo="erro">{estado.erro}</Alerta>}
      {estado.sucesso && <Alerta tipo="sucesso">{estado.sucesso}</Alerta>}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="rotulo mb-2 block text-white/45">Data</span>
          <input
            type="date"
            name="data"
            defaultValue={hoje()}
            required
            className="campo w-full px-4 py-2.5"
          />
        </label>

        <Campo label="Faturamento (R$)" name="faturamento" placeholder="3.450,00" />
        <Campo
          label="Atendimentos"
          name="num_atendimentos"
          required={false}
          placeholder="Para calcular o ticket médio"
        />
        <Campo
          label="Canal"
          name="canal"
          required={false}
          placeholder="Salão, delivery, balcão..."
        />
      </div>

      <p className="text-xs text-white/40">
        Lançar a mesma data e canal novamente corrige o valor anterior, sem
        duplicar.
      </p>

      <div className="max-w-xs">
        <BotaoSubmit>Registrar faturamento</BotaoSubmit>
      </div>
    </form>
  );
}

function FormPagar() {
  const [estado, acao] = useFormState(salvarContaPagar, estadoInicial);
  const [grupo, setGrupo] = useState("cmv");
  const ajuda = GRUPOS_DRE.find((g) => g.valor === grupo)?.ajuda;

  return (
    <form action={acao} className="space-y-4">
      {estado.erro && <Alerta tipo="erro">{estado.erro}</Alerta>}
      {estado.sucesso && <Alerta tipo="sucesso">{estado.sucesso}</Alerta>}

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo label="Descrição" name="descricao" placeholder="Hortifruti semanal" />
        <Campo label="Fornecedor" name="contraparte" required={false} />
        <Campo label="Valor (R$)" name="valor" placeholder="890,00" />

        <label className="block">
          <span className="rotulo mb-2 block text-white/45">Vencimento</span>
          <input
            type="date"
            name="vencimento"
            required
            className="campo w-full px-4 py-2.5"
          />
        </label>

        <label className="block sm:col-span-2">
          <span className="rotulo mb-2 block text-white/45">
            Classificação
          </span>
          <select
            name="grupo_dre"
            value={grupo}
            onChange={(e) => setGrupo(e.target.value)}
            className="campo w-full px-4 py-2.5"
          >
            {GRUPOS_DRE.map((g) => (
              <option key={g.valor} value={g.valor}>
                {g.rotulo}
              </option>
            ))}
          </select>
          {ajuda && <p className="mt-1.5 text-xs text-white/40">{ajuda}</p>}
        </label>
      </div>

      <div className="max-w-xs">
        <BotaoSubmit>Registrar conta</BotaoSubmit>
      </div>
    </form>
  );
}

function FormReceber() {
  const [estado, acao] = useFormState(salvarContaReceber, estadoInicial);

  return (
    <form action={acao} className="space-y-4">
      {estado.erro && <Alerta tipo="erro">{estado.erro}</Alerta>}
      {estado.sucesso && <Alerta tipo="sucesso">{estado.sucesso}</Alerta>}

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo label="Descrição" name="descricao" placeholder="Evento corporativo" />
        <Campo label="Cliente" name="contraparte" required={false} />
        <Campo label="Valor (R$)" name="valor" placeholder="2.400,00" />

        <label className="block">
          <span className="rotulo mb-2 block text-white/45">Vencimento</span>
          <input
            type="date"
            name="vencimento"
            required
            className="campo w-full px-4 py-2.5"
          />
        </label>
      </div>

      <p className="text-xs text-white/40">
        Use para vendas a prazo, eventos e contratos. Vendas do dia a dia entram
        em Faturamento do dia.
      </p>

      <div className="max-w-xs">
        <BotaoSubmit>Registrar conta</BotaoSubmit>
      </div>
    </form>
  );
}
