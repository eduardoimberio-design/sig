"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import {
  salvarInsumo,
  salvarProduto,
  adicionarItemFicha,
  removerItemFicha,
  salvarEquipamento,
  type EstadoForm,
} from "@/app/actions/estoque";
import { Campo, BotaoSubmit, Alerta } from "@/components/ui";
import { moeda } from "@/lib/formatters";

const estadoInicial: EstadoForm = {};

interface Insumo {
  id: string;
  nome: string;
  unidade_medida: string;
  custo_unitario: number;
  estoque_atual: number;
  estoque_minimo: number;
  fornecedor_principal: string | null;
}

interface Produto {
  id: string;
  nome: string;
  categoria: string | null;
  preco_venda: number;
}

interface ItemFicha {
  id: string;
  produto_id: string;
  insumo_id: string;
  quantidade: number;
}

interface Equipamento {
  id: string;
  tipo: string;
  categoria: string;
  marca_modelo: string | null;
  capacidade_gn: number | null;
  capacidade_litros: number | null;
  quantidade: number;
  dominio_equipe: string | null;
  restricoes: string | null;
  estado: string;
}

// ---------------------------------------------------------
// INSUMOS
// ---------------------------------------------------------
export function PainelInsumos({ insumos }: { insumos: Insumo[] }) {
  const [aberto, setAberto] = useState(insumos.length === 0);
  const [estado, acao] = useFormState(salvarInsumo, estadoInicial);

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="titulo text-xl">Insumos</h2>
        <button
          onClick={() => setAberto(!aberto)}
          className="rotulo border border-base-border px-3 py-1.5 text-white/50 hover:text-white/80"
        >
          {aberto ? "Fechar" : "+ Novo insumo"}
        </button>
      </div>

      {aberto && (
        <form action={acao} className="painel mb-4 space-y-4 p-6">
          {estado.erro && <Alerta tipo="erro">{estado.erro}</Alerta>}
          {estado.sucesso && <Alerta tipo="sucesso">{estado.sucesso}</Alerta>}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Campo label="Nome" name="nome" placeholder="Mussarela" />
            <Campo label="Unidade" name="unidade_medida" placeholder="kg, l, un..." />
            <Campo label="Custo unitário (R$)" name="custo_unitario" placeholder="32,50" />
            <Campo
              label="Estoque atual"
              name="estoque_atual"
              required={false}
              placeholder="0"
            />
            <Campo
              label="Estoque mínimo"
              name="estoque_minimo"
              required={false}
              placeholder="0"
            />
            <Campo
              label="Fornecedor principal"
              name="fornecedor_principal"
              required={false}
            />
          </div>

          <div className="max-w-xs">
            <BotaoSubmit>Cadastrar insumo</BotaoSubmit>
          </div>
        </form>
      )}

      {insumos.length > 0 ? (
        <div className="painel overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-base-border text-left">
                <th className="rotulo px-4 py-3 font-normal text-white/40">Nome</th>
                <th className="rotulo px-4 py-3 text-right font-normal text-white/40">
                  Custo
                </th>
                <th className="rotulo px-4 py-3 text-right font-normal text-white/40">
                  Estoque
                </th>
              </tr>
            </thead>
            <tbody>
              {insumos.map((i) => (
                <tr key={i.id} className="border-b border-base-border last:border-0">
                  <td className="px-4 py-3">{i.nome}</td>
                  <td className="cifra px-4 py-3 text-right text-white/70">
                    {moeda(i.custo_unitario)} / {i.unidade_medida}
                  </td>
                  <td
                    className={`cifra px-4 py-3 text-right ${
                      i.estoque_atual < i.estoque_minimo
                        ? "text-negativo"
                        : "text-white/60"
                    }`}
                  >
                    {i.estoque_atual} {i.unidade_medida}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        !aberto && (
          <p className="painel p-6 text-sm text-white/45">
            Nenhum insumo cadastrado ainda.
          </p>
        )
      )}
    </section>
  );
}

// ---------------------------------------------------------
// PRODUTOS + FICHA TÉCNICA
// ---------------------------------------------------------
export function PainelProdutos({
  produtos,
  insumos,
  fichaItens,
}: {
  produtos: Produto[];
  insumos: Insumo[];
  fichaItens: ItemFicha[];
}) {
  const [abertoNovo, setAbertoNovo] = useState(produtos.length === 0);
  const [produtoExpandido, setProdutoExpandido] = useState<string | null>(null);
  const [estado, acao] = useFormState(salvarProduto, estadoInicial);

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="titulo text-xl">Produtos e ficha técnica</h2>
        <button
          onClick={() => setAbertoNovo(!abertoNovo)}
          className="rotulo border border-base-border px-3 py-1.5 text-white/50 hover:text-white/80"
        >
          {abertoNovo ? "Fechar" : "+ Novo produto"}
        </button>
      </div>

      {abertoNovo && (
        <form action={acao} className="painel mb-4 space-y-4 p-6">
          {estado.erro && <Alerta tipo="erro">{estado.erro}</Alerta>}
          {estado.sucesso && <Alerta tipo="sucesso">{estado.sucesso}</Alerta>}
          <div className="grid gap-4 sm:grid-cols-3">
            <Campo label="Nome" name="nome" placeholder="Lasanha à bolonhesa" />
            <Campo label="Categoria" name="categoria" required={false} placeholder="Prato principal" />
            <Campo label="Preço de venda (R$)" name="preco_venda" placeholder="48,00" />
          </div>
          <div className="max-w-xs">
            <BotaoSubmit>Cadastrar produto</BotaoSubmit>
          </div>
        </form>
      )}

      {produtos.length === 0 && !abertoNovo && (
        <p className="painel p-6 text-sm text-white/45">
          Nenhum produto cadastrado ainda.
        </p>
      )}

      <div className="space-y-2">
        {produtos.map((produto) => {
          const itensDoProduto = fichaItens.filter(
            (f) => f.produto_id === produto.id
          );
          const expandido = produtoExpandido === produto.id;

          return (
            <div key={produto.id} className="painel overflow-hidden">
              <button
                onClick={() =>
                  setProdutoExpandido(expandido ? null : produto.id)
                }
                className="flex w-full items-center justify-between px-5 py-4 text-left"
              >
                <span>
                  {produto.nome}
                  <span className="ml-2 text-xs text-white/35">
                    {itensDoProduto.length}{" "}
                    {itensDoProduto.length === 1 ? "insumo" : "insumos"}
                  </span>
                </span>
                <span className="cifra text-ambar">
                  {moeda(produto.preco_venda)}
                </span>
              </button>

              {expandido && (
                <div className="border-t border-base-border p-5">
                  <div className="mb-4 space-y-2">
                    {itensDoProduto.map((item) => {
                      const insumo = insumos.find((i) => i.id === item.insumo_id);
                      return (
                        <div
                          key={item.id}
                          className="flex items-center justify-between text-sm text-white/70"
                        >
                          <span>
                            {insumo?.nome ?? "Insumo removido"} —{" "}
                            <span className="cifra">{item.quantidade}</span>{" "}
                            {insumo?.unidade_medida}
                          </span>
                          <form action={removerItemFicha}>
                            <input type="hidden" name="id" value={item.id} />
                            <button className="text-xs text-negativo/70 hover:text-negativo">
                              remover
                            </button>
                          </form>
                        </div>
                      );
                    })}
                    {itensDoProduto.length === 0 && (
                      <p className="text-sm text-white/35">
                        Nenhum insumo na ficha técnica ainda.
                      </p>
                    )}
                  </div>

                  <FormAdicionarItem produtoId={produto.id} insumos={insumos} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function FormAdicionarItem({
  produtoId,
  insumos,
}: {
  produtoId: string;
  insumos: Insumo[];
}) {
  const [estado, acao] = useFormState(adicionarItemFicha, estadoInicial);

  if (insumos.length === 0) {
    return (
      <p className="text-xs text-white/35">
        Cadastre insumos acima antes de montar a ficha técnica.
      </p>
    );
  }

  return (
    <form action={acao} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="produto_id" value={produtoId} />

      {estado.erro && (
        <div className="w-full">
          <Alerta tipo="erro">{estado.erro}</Alerta>
        </div>
      )}

      <label className="block">
        <span className="rotulo mb-2 block text-white/45">Insumo</span>
        <select name="insumo_id" required className="campo px-3 py-2 text-sm">
          <option value="">Selecione</option>
          {insumos.map((i) => (
            <option key={i.id} value={i.id}>
              {i.nome} ({i.unidade_medida})
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="rotulo mb-2 block text-white/45">Quantidade</span>
        <input
          name="quantidade"
          required
          placeholder="0,150"
          className="campo w-28 px-3 py-2 text-sm"
        />
      </label>

      <button className="rotulo border border-cyan bg-cyan/10 px-4 py-2 text-cyan hover:bg-cyan hover:text-base-bg">
        Adicionar
      </button>
    </form>
  );
}

// ---------------------------------------------------------
// EQUIPAMENTOS
// ---------------------------------------------------------
const CATEGORIAS = [
  { valor: "coccao", rotulo: "Cocção" },
  { valor: "preparo", rotulo: "Preparo" },
  { valor: "conservacao", rotulo: "Conservação" },
  { valor: "embalagem", rotulo: "Embalagem" },
  { valor: "apoio", rotulo: "Apoio" },
];

const DOMINIO_ROTULO: Record<string, string> = {
  pleno: "Domínio pleno",
  parcial: "Domínio parcial",
  baixo: "Baixo domínio",
};

export function PainelEquipamentos({
  equipamentos,
}: {
  equipamentos: Equipamento[];
}) {
  const [aberto, setAberto] = useState(equipamentos.length === 0);
  const [estado, acao] = useFormState(salvarEquipamento, estadoInicial);

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="titulo text-xl">Equipamentos da cozinha</h2>
        <button
          onClick={() => setAberto(!aberto)}
          className="rotulo border border-base-border px-3 py-1.5 text-white/50 hover:text-white/80"
        >
          {aberto ? "Fechar" : "+ Novo equipamento"}
        </button>
      </div>
      <p className="mb-4 max-w-2xl text-xs leading-relaxed text-white/40">
        Isso alimenta o futuro agente de workflow de produção — ele considera
        capacidade e domínio da equipe para montar um plano realista, não
        genérico.
      </p>

      {aberto && (
        <form action={acao} className="painel mb-4 space-y-4 p-6">
          {estado.erro && <Alerta tipo="erro">{estado.erro}</Alerta>}
          {estado.sucesso && <Alerta tipo="sucesso">{estado.sucesso}</Alerta>}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Campo label="Tipo" name="tipo" placeholder="Forno combinado" />

            <label className="block">
              <span className="rotulo mb-2 block text-white/45">Categoria</span>
              <select name="categoria" required className="campo px-4 py-2.5">
                {CATEGORIAS.map((c) => (
                  <option key={c.valor} value={c.valor}>
                    {c.rotulo}
                  </option>
                ))}
              </select>
            </label>

            <Campo
              label="Marca / modelo"
              name="marca_modelo"
              required={false}
              placeholder="Rational iCombi"
            />
            <Campo
              label="Capacidade (GN)"
              name="capacidade_gn"
              required={false}
              placeholder="6"
            />
            <Campo
              label="Capacidade (litros)"
              name="capacidade_litros"
              required={false}
              placeholder="40"
            />
            <Campo
              label="Quantidade"
              name="quantidade"
              required={false}
              placeholder="1"
            />

            <label className="block">
              <span className="rotulo mb-2 block text-white/45">
                Domínio da equipe
              </span>
              <select name="dominio_equipe" className="campo px-4 py-2.5">
                <option value="">Não informado</option>
                <option value="pleno">Domínio pleno</option>
                <option value="parcial">Domínio parcial</option>
                <option value="baixo">Baixo domínio</option>
              </select>
            </label>

            <div className="sm:col-span-2 lg:col-span-3">
              <Campo
                label="Restrições"
                name="restricoes"
                required={false}
                placeholder="Ex.: só 1 pessoa sabe programar"
              />
            </div>
          </div>

          <div className="max-w-xs">
            <BotaoSubmit>Cadastrar equipamento</BotaoSubmit>
          </div>
        </form>
      )}

      {equipamentos.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {equipamentos.map((e) => (
            <div key={e.id} className="painel p-4">
              <p className="text-sm text-white">{e.tipo}</p>
              {e.marca_modelo && (
                <p className="text-xs text-white/40">{e.marca_modelo}</p>
              )}
              <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-white/50">
                {e.capacidade_gn && <span>{e.capacidade_gn} GN</span>}
                {e.capacidade_litros && <span>{e.capacidade_litros}L</span>}
                {e.quantidade > 1 && <span>×{e.quantidade}</span>}
              </div>
              {e.dominio_equipe && (
                <p
                  className={`mt-2 text-xs ${
                    e.dominio_equipe === "baixo"
                      ? "text-alerta"
                      : "text-white/40"
                  }`}
                >
                  {DOMINIO_ROTULO[e.dominio_equipe]}
                </p>
              )}
            </div>
          ))}
        </div>
      ) : (
        !aberto && (
          <p className="painel p-6 text-sm text-white/45">
            Nenhum equipamento cadastrado ainda.
          </p>
        )
      )}
    </section>
  );
}
