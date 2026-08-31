"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import {
  editarConta,
  editarVenda,
  excluirLancamento,
  type EstadoForm,
} from "@/app/actions/financeiro";
import { Alerta, BotaoSubmit } from "@/components/ui";

const estadoInicial: EstadoForm = {};

export type Lancamento = {
  id: string;
  tipo: "pagar" | "receber" | "venda";
  descricao: string;
  valor: number;
  data: string;
  contraparte: string | null;
  grupo_dre: string | null;
  status: string | null;
  num_atendimentos?: number | null;
};

const GRUPOS_DRE = [
  { valor: "cmv", rotulo: "Mercadoria (CMV)" },
  { valor: "pessoal", rotulo: "Pessoal / folha" },
  { valor: "despesa_fixa", rotulo: "Despesa fixa" },
  { valor: "despesa_variavel", rotulo: "Despesa variável" },
];

const ROTULO_TIPO: Record<string, string> = {
  pagar: "A pagar",
  receber: "A receber",
  venda: "Faturamento",
};

function moedaBR(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function dataBR(iso: string) {
  const [ano, mes, dia] = iso.slice(0, 10).split("-");
  return `${dia}/${mes}/${ano}`;
}

export function ListaLancamentos({
  lancamentos,
}: {
  lancamentos: Lancamento[];
}) {
  if (lancamentos.length === 0) {
    return (
      <div className="painel p-6">
        <p className="text-sm text-white/45">
          Nenhum lançamento encontrado com esses filtros.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {lancamentos.map((l) => (
        <Linha key={`${l.tipo}-${l.id}`} lancamento={l} />
      ))}
    </div>
  );
}

function Linha({ lancamento: l }: { lancamento: Lancamento }) {
  const [aberto, setAberto] = useState(false);

  return (
    <div className="painel p-4">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="flex w-full items-baseline justify-between gap-4 text-left"
      >
        <div className="min-w-0">
          <p className="truncate text-sm text-white/80">{l.descricao}</p>
          <p className="mt-0.5 text-xs text-white/35">
            <span className="rotulo text-cyan/60">{ROTULO_TIPO[l.tipo]}</span>
            {" · "}
            {dataBR(l.data)}
            {l.contraparte ? ` · ${l.contraparte}` : ""}
            {l.status ? ` · ${l.status}` : ""}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <span className="cifra text-ambar">{moedaBR(l.valor)}</span>
          <p className="text-xs text-white/25">
            {aberto ? "fechar" : "corrigir"}
          </p>
        </div>
      </button>

      {aberto && (
        <div className="mt-4 border-t border-base-border pt-4">
          {l.tipo === "venda" ? (
            <FormVenda lancamento={l} />
          ) : (
            <FormConta lancamento={l} />
          )}
        </div>
      )}
    </div>
  );
}

function FormConta({ lancamento: l }: { lancamento: Lancamento }) {
  const [estado, acao] = useFormState(editarConta, estadoInicial);

  return (
    <>
      {estado.erro && (
        <div className="mb-3">
          <Alerta tipo="erro">{estado.erro}</Alerta>
        </div>
      )}
      {estado.sucesso && (
        <div className="mb-3">
          <Alerta tipo="sucesso">{estado.sucesso}</Alerta>
        </div>
      )}

      <form action={acao} className="space-y-3">
        <input type="hidden" name="id" value={l.id} />
        <input type="hidden" name="tipo" value={l.tipo} />

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="rotulo mb-1 block text-white/40">Descrição</span>
            <input
              name="descricao"
              defaultValue={l.descricao}
              className="campo w-full px-3 py-2 text-sm"
            />
          </label>

          <label className="block">
            <span className="rotulo mb-1 block text-white/40">Valor</span>
            <input
              name="valor"
              defaultValue={String(l.valor).replace(".", ",")}
              className="campo w-full px-3 py-2 text-sm"
            />
          </label>

          <label className="block">
            <span className="rotulo mb-1 block text-white/40">Vencimento</span>
            <input
              name="vencimento"
              type="date"
              defaultValue={l.data.slice(0, 10)}
              className="campo w-full px-3 py-2 text-sm"
            />
          </label>

          <label className="block">
            <span className="rotulo mb-1 block text-white/40">
              {l.tipo === "pagar" ? "Fornecedor" : "Cliente"}
            </span>
            <input
              name="contraparte"
              defaultValue={l.contraparte ?? ""}
              className="campo w-full px-3 py-2 text-sm"
            />
          </label>

          {l.tipo === "pagar" && (
            <label className="block sm:col-span-2">
              <span className="rotulo mb-1 block text-white/40">
                Grupo no DRE
              </span>
              <select
                name="grupo_dre"
                defaultValue={l.grupo_dre ?? "despesa_variavel"}
                className="campo w-full px-3 py-2 text-sm"
              >
                {GRUPOS_DRE.map((g) => (
                  <option key={g.valor} value={g.valor}>
                    {g.rotulo}
                  </option>
                ))}
              </select>
              <span className="mt-1 block text-xs text-white/30">
                É o que separa mercadoria de folha no cálculo do CMV.
              </span>
            </label>
          )}
        </div>

        <div className="flex items-center gap-4 pt-1">
          <BotaoSubmit>Salvar correção</BotaoSubmit>
        </div>
      </form>

      <FormExcluir id={l.id} tipo={l.tipo} />
    </>
  );
}

function FormVenda({ lancamento: l }: { lancamento: Lancamento }) {
  const [estado, acao] = useFormState(editarVenda, estadoInicial);

  return (
    <>
      {estado.erro && (
        <div className="mb-3">
          <Alerta tipo="erro">{estado.erro}</Alerta>
        </div>
      )}
      {estado.sucesso && (
        <div className="mb-3">
          <Alerta tipo="sucesso">{estado.sucesso}</Alerta>
        </div>
      )}

      <form action={acao} className="space-y-3">
        <input type="hidden" name="id" value={l.id} />

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="rotulo mb-1 block text-white/40">Data</span>
            <input
              name="data"
              type="date"
              defaultValue={l.data.slice(0, 10)}
              className="campo w-full px-3 py-2 text-sm"
            />
          </label>

          <label className="block">
            <span className="rotulo mb-1 block text-white/40">Faturamento</span>
            <input
              name="faturamento"
              defaultValue={String(l.valor).replace(".", ",")}
              className="campo w-full px-3 py-2 text-sm"
            />
          </label>

          <label className="block">
            <span className="rotulo mb-1 block text-white/40">
              Atendimentos
            </span>
            <input
              name="num_atendimentos"
              type="number"
              min={0}
              defaultValue={l.num_atendimentos ?? 0}
              className="campo w-full px-3 py-2 text-sm"
            />
          </label>

          <label className="block">
            <span className="rotulo mb-1 block text-white/40">Canal</span>
            <input
              name="canal"
              defaultValue={l.contraparte ?? ""}
              placeholder="salão, delivery, balcão"
              className="campo w-full px-3 py-2 text-sm placeholder-white/20"
            />
          </label>
        </div>

        <div className="pt-1">
          <BotaoSubmit>Salvar correção</BotaoSubmit>
        </div>
      </form>

      <FormExcluir id={l.id} tipo={l.tipo} />
    </>
  );
}

function FormExcluir({ id, tipo }: { id: string; tipo: string }) {
  const [confirmando, setConfirmando] = useState(false);
  const [estado, acao] = useFormState(excluirLancamento, estadoInicial);

  if (!confirmando) {
    return (
      <button
        type="button"
        onClick={() => setConfirmando(true)}
        className="mt-4 text-xs text-white/35 underline hover:text-negativo"
      >
        Excluir lançamento
      </button>
    );
  }

  return (
    <div className="mt-4 border-l-2 border-negativo pl-4">
      <p className="text-sm text-white/60">
        Excluir apaga o lançamento de vez e muda os números do período. Tem
        certeza?
      </p>
      {estado.erro && (
        <p className="mt-2 text-xs text-negativo">{estado.erro}</p>
      )}
      <div className="mt-3 flex items-center gap-4">
        <form action={acao}>
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="tipo" value={tipo} />
          <button
            type="submit"
            className="rotulo border border-negativo px-4 py-2 text-xs text-negativo
                       transition-colors hover:bg-negativo hover:text-base-bg"
          >
            Sim, excluir
          </button>
        </form>
        <button
          type="button"
          onClick={() => setConfirmando(false)}
          className="text-xs text-white/40 hover:text-white/70"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
