"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import {
  editarInsumo,
  excluirInsumo,
  editarProduto,
  excluirProduto,
  editarItemFicha,
  removerItemFicha,
  type EstadoForm,
} from "@/app/actions/estoque";
import { Alerta, BotaoSubmit } from "@/components/ui";
import { moeda } from "@/lib/formatters";

const estadoInicial: EstadoForm = {};

const UNIDADES = ["kg", "g", "l", "ml", "un", "cx", "pct"];

export type Insumo = {
  id: string;
  nome: string;
  unidade_medida: string;
  custo_unitario: number;
  estoque_atual: number;
  estoque_minimo: number;
  fornecedor_principal: string | null;
};

export type ItemFicha = {
  id: string;
  quantidade: number;
  insumo: { nome: string; unidade_medida: string; custo_unitario: number } | null;
};

export type Produto = {
  id: string;
  nome: string;
  categoria: string | null;
  preco_venda: number;
  ficha: ItemFicha[];
};

// ---------------------------------------------------------
// INSUMOS
// ---------------------------------------------------------
export function ListaInsumos({ insumos }: { insumos: Insumo[] }) {
  if (insumos.length === 0) {
    return (
      <div className="painel p-6">
        <p className="text-sm text-white/45">Nenhum insumo encontrado.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {insumos.map((i) => (
        <LinhaInsumo key={i.id} insumo={i} />
      ))}
    </div>
  );
}

function LinhaInsumo({ insumo }: { insumo: Insumo }) {
  const [aberto, setAberto] = useState(false);
  const [estado, acao] = useFormState(editarInsumo, estadoInicial);

  const abaixoDoMinimo =
    Number(insumo.estoque_minimo) > 0 &&
    Number(insumo.estoque_atual) < Number(insumo.estoque_minimo);

  return (
    <div className="painel p-4">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="flex w-full items-baseline justify-between gap-4 text-left"
      >
        <div className="min-w-0">
          <p className="truncate text-sm text-white/80">{insumo.nome}</p>
          <p className="mt-0.5 text-xs text-white/35">
            {insumo.estoque_atual} {insumo.unidade_medida} em estoque
            {abaixoDoMinimo && (
              <span className="text-alerta"> · abaixo do mínimo</span>
            )}
            {insumo.fornecedor_principal
              ? ` · ${insumo.fornecedor_principal}`
              : ""}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <span className="cifra text-ambar">
            {moeda(insumo.custo_unitario)}
          </span>
          <p className="text-xs text-white/25">
            por {insumo.unidade_medida} · {aberto ? "fechar" : "corrigir"}
          </p>
        </div>
      </button>

      {aberto && (
        <div className="mt-4 border-t border-base-border pt-4">
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
            <input type="hidden" name="id" value={insumo.id} />

            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block sm:col-span-2">
                <span className="rotulo mb-1 block text-white/40">Nome</span>
                <input
                  name="nome"
                  defaultValue={insumo.nome}
                  className="campo w-full px-3 py-2 text-sm"
                />
              </label>

              <label className="block">
                <span className="rotulo mb-1 block text-white/40">Unidade</span>
                <select
                  name="unidade_medida"
                  defaultValue={insumo.unidade_medida}
                  className="campo w-full px-3 py-2 text-sm"
                >
                  {UNIDADES.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="rotulo mb-1 block text-white/40">
                  Custo por unidade
                </span>
                <input
                  name="custo_unitario"
                  defaultValue={String(insumo.custo_unitario).replace(".", ",")}
                  className="campo w-full px-3 py-2 text-sm"
                />
                <span className="mt-1 block text-xs text-white/30">
                  Entra direto no CMV.
                </span>
              </label>

              <label className="block">
                <span className="rotulo mb-1 block text-white/40">
                  Estoque atual
                </span>
                <input
                  name="estoque_atual"
                  defaultValue={String(insumo.estoque_atual).replace(".", ",")}
                  className="campo w-full px-3 py-2 text-sm"
                />
              </label>

              <label className="block">
                <span className="rotulo mb-1 block text-white/40">
                  Estoque mínimo
                </span>
                <input
                  name="estoque_minimo"
                  defaultValue={String(insumo.estoque_minimo).replace(".", ",")}
                  className="campo w-full px-3 py-2 text-sm"
                />
              </label>

              <label className="block sm:col-span-3">
                <span className="rotulo mb-1 block text-white/40">
                  Fornecedor principal
                </span>
                <input
                  name="fornecedor_principal"
                  defaultValue={insumo.fornecedor_principal ?? ""}
                  className="campo w-full px-3 py-2 text-sm"
                />
              </label>
            </div>

            <BotaoSubmit>Salvar correção</BotaoSubmit>
          </form>

          <Excluir id={insumo.id} acaoExcluir="insumo" />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------
// PRODUTOS E FICHA TÉCNICA
// ---------------------------------------------------------
export function ListaProdutos({ produtos }: { produtos: Produto[] }) {
  if (produtos.length === 0) {
    return (
      <div className="painel p-6">
        <p className="text-sm text-white/45">Nenhum produto encontrado.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {produtos.map((p) => (
        <LinhaProduto key={p.id} produto={p} />
      ))}
    </div>
  );
}

function LinhaProduto({ produto }: { produto: Produto }) {
  const [aberto, setAberto] = useState(false);
  const [estado, acao] = useFormState(editarProduto, estadoInicial);

  const custo = produto.ficha.reduce(
    (s, i) => s + Number(i.quantidade) * Number(i.insumo?.custo_unitario ?? 0),
    0
  );
  const cmvPct =
    Number(produto.preco_venda) > 0
      ? (custo * 100) / Number(produto.preco_venda)
      : 0;

  return (
    <div className="painel p-4">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="flex w-full items-baseline justify-between gap-4 text-left"
      >
        <div className="min-w-0">
          <p className="truncate text-sm text-white/80">{produto.nome}</p>
          <p className="mt-0.5 text-xs text-white/35">
            {produto.categoria ?? "sem categoria"} · custo {moeda(custo)}
            {cmvPct > 0 && (
              <span
                className={
                  cmvPct <= 30
                    ? " text-positivo"
                    : cmvPct <= 38
                      ? " text-alerta"
                      : " text-negativo"
                }
              >
                {" "}
                · {cmvPct.toFixed(1)}% do preço
              </span>
            )}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <span className="cifra text-ambar">{moeda(produto.preco_venda)}</span>
          <p className="text-xs text-white/25">
            {aberto ? "fechar" : "corrigir"}
          </p>
        </div>
      </button>

      {aberto && (
        <div className="mt-4 space-y-5 border-t border-base-border pt-4">
          {estado.erro && <Alerta tipo="erro">{estado.erro}</Alerta>}
          {estado.sucesso && <Alerta tipo="sucesso">{estado.sucesso}</Alerta>}

          <form action={acao} className="space-y-3">
            <input type="hidden" name="id" value={produto.id} />
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block">
                <span className="rotulo mb-1 block text-white/40">Nome</span>
                <input
                  name="nome"
                  defaultValue={produto.nome}
                  className="campo w-full px-3 py-2 text-sm"
                />
              </label>
              <label className="block">
                <span className="rotulo mb-1 block text-white/40">
                  Categoria
                </span>
                <input
                  name="categoria"
                  defaultValue={produto.categoria ?? ""}
                  className="campo w-full px-3 py-2 text-sm"
                />
              </label>
              <label className="block">
                <span className="rotulo mb-1 block text-white/40">
                  Preço de venda
                </span>
                <input
                  name="preco_venda"
                  defaultValue={String(produto.preco_venda).replace(".", ",")}
                  className="campo w-full px-3 py-2 text-sm"
                />
              </label>
            </div>
            <BotaoSubmit>Salvar produto</BotaoSubmit>
          </form>

          <div>
            <p className="rotulo mb-3 text-white/45">Ficha técnica</p>

            {produto.ficha.length === 0 ? (
              <p className="text-sm text-white/35">
                Sem ficha técnica. Sem ela, o CMV deste produto não é
                calculado.
              </p>
            ) : (
              <div className="space-y-2">
                {produto.ficha.map((item) => (
                  <LinhaFicha key={item.id} item={item} />
                ))}
              </div>
            )}
          </div>

          <Excluir id={produto.id} acaoExcluir="produto" />
        </div>
      )}
    </div>
  );
}

function LinhaFicha({ item }: { item: ItemFicha }) {
  const [estado, acao] = useFormState(editarItemFicha, estadoInicial);

  const custoItem =
    Number(item.quantidade) * Number(item.insumo?.custo_unitario ?? 0);

  return (
    <div className="border border-base-border p-3">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <span className="text-sm text-white/70">
          {item.insumo?.nome ?? "insumo removido"}
        </span>
        <span className="cifra text-xs text-ambar">{moeda(custoItem)}</span>
      </div>

      {estado.erro && (
        <p className="mb-2 text-xs text-negativo">{estado.erro}</p>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <form action={acao} className="flex items-end gap-2">
          <input type="hidden" name="id" value={item.id} />
          <label className="block">
            <span className="rotulo mb-1 block text-white/35">
              Quantidade ({item.insumo?.unidade_medida ?? "un"})
            </span>
            <input
              name="quantidade"
              defaultValue={String(item.quantidade).replace(".", ",")}
              className="campo w-32 px-3 py-1.5 text-sm"
            />
          </label>
          <button
            type="submit"
            className="rotulo border border-cyan/40 px-3 py-1.5 text-xs text-cyan
                       transition-colors hover:bg-cyan hover:text-base-bg"
          >
            Salvar
          </button>
        </form>

        <form action={removerItemFicha}>
          <input type="hidden" name="item_id" value={item.id} />
          <button className="text-xs text-white/30 underline hover:text-negativo">
            Remover da ficha
          </button>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------
function Excluir({
  id,
  acaoExcluir,
}: {
  id: string;
  acaoExcluir: "insumo" | "produto";
}) {
  const [confirmando, setConfirmando] = useState(false);
  const [estado, acao] = useFormState(
    acaoExcluir === "insumo" ? excluirInsumo : excluirProduto,
    estadoInicial
  );

  if (!confirmando) {
    return (
      <button
        type="button"
        onClick={() => setConfirmando(true)}
        className="mt-4 text-xs text-white/30 underline hover:text-negativo"
      >
        Excluir {acaoExcluir}
      </button>
    );
  }

  return (
    <div className="mt-4 border-l-2 border-negativo pl-4">
      <p className="text-sm text-white/60">
        Excluir apaga de vez e muda os números do período. Tem certeza?
      </p>
      {estado.erro && (
        <p className="mt-2 text-xs text-negativo">{estado.erro}</p>
      )}
      <div className="mt-3 flex items-center gap-4">
        <form action={acao}>
          <input type="hidden" name="id" value={id} />
          <button
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
