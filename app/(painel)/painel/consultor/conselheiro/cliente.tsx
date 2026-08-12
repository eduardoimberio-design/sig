"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import {
  criarCaso,
  gerarIshikawaAction,
  salvarIshikawa,
  gerarCincoPorquesAction,
  salvarCincoPorques,
  gerarPlano5W2HAction,
  salvarPlano5W2H,
  salvarSwot,
  atualizarStatusCaso,
  type EstadoForm,
} from "@/app/actions/conselheiro";
import { Campo, Alerta } from "@/components/ui";

const estadoInicial: EstadoForm = {};

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

const CATEGORIAS_ISHIKAWA = [
  { valor: "metodo", rotulo: "Método" },
  { valor: "mao_de_obra", rotulo: "Mão de obra" },
  { valor: "maquina", rotulo: "Máquina" },
  { valor: "material", rotulo: "Material" },
  { valor: "meio_ambiente", rotulo: "Meio ambiente" },
  { valor: "medicao", rotulo: "Medição" },
];

// ---------------------------------------------------------
// NOVO CASO
// ---------------------------------------------------------
export function FormNovoCaso({ habilitado }: { habilitado: boolean }) {
  const [estado, acao] = useFormState(criarCaso, estadoInicial);
  const [aberto, setAberto] = useState(false);
  const [tipo, setTipo] = useState<"ishikawa" | "swot">("ishikawa");
  const [enviando, setEnviando] = useState(false);

  if (!aberto) {
    return (
      <button
        onClick={() => setAberto(true)}
        className="rotulo border border-cyan bg-cyan/10 px-6 py-2.5 text-cyan transition-colors hover:bg-cyan hover:text-base-bg"
      >
        + Novo caso
      </button>
    );
  }

  return (
    <form
      action={async (fd) => {
        setEnviando(true);
        await acao(fd);
        setEnviando(false);
        setAberto(false);
      }}
      className="painel space-y-4 p-6"
    >
      {estado.erro && <Alerta tipo="erro">{estado.erro}</Alerta>}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setTipo("ishikawa")}
          className={`rotulo border px-4 py-2 transition-colors ${
            tipo === "ishikawa"
              ? "border-cyan bg-cyan/10 text-cyan"
              : "border-base-border text-white/50 hover:text-white/80"
          }`}
        >
          Resolver um problema
        </button>
        <button
          type="button"
          onClick={() => setTipo("swot")}
          className={`rotulo border px-4 py-2 transition-colors ${
            tipo === "swot"
              ? "border-cyan bg-cyan/10 text-cyan"
              : "border-base-border text-white/50 hover:text-white/80"
          }`}
        >
          Avaliar uma decisão
        </button>
      </div>
      <input type="hidden" name="tipo_inicial" value={tipo} />

      <Campo
        label="Título curto"
        name="titulo"
        placeholder={
          tipo === "ishikawa"
            ? "Ex.: Atraso no serviço do almoço"
            : "Ex.: Abrir uma segunda unidade?"
        }
      />

      <label className="block">
        <span className="rotulo mb-2 block text-white/45">
          {tipo === "ishikawa" ? "Descreva o problema" : "Descreva a decisão ou questão"}
        </span>
        <textarea
          name="descricao_problema"
          rows={3}
          required
          placeholder={
            tipo === "ishikawa"
              ? "Quanto mais detalhe, melhores as causas sugeridas."
              : "Contexto da decisão que você está avaliando."
          }
          className="campo w-full px-4 py-2.5 text-sm"
        />
      </label>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={!habilitado || enviando}
          className="rotulo border border-cyan bg-cyan/10 px-6 py-2.5 text-cyan transition-colors hover:bg-cyan hover:text-base-bg disabled:opacity-40"
        >
          {enviando ? "Analisando..." : "Criar caso"}
        </button>
        <button
          type="button"
          onClick={() => setAberto(false)}
          className="rotulo px-4 py-2.5 text-white/40 hover:text-white/70"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------
// LISTA E DETALHE DO CASO
// ---------------------------------------------------------
const STATUS_ROTULO: Record<string, string> = {
  aberto: "Aberto",
  resolvido: "Resolvido",
  arquivado: "Arquivado",
};

const STATUS_COR: Record<string, string> = {
  aberto: "text-cyan",
  resolvido: "text-positivo",
  arquivado: "text-white/30",
};

export function ListaCasos({ casos }: { casos: any[] }) {
  const [expandido, setExpandido] = useState<string | null>(casos[0]?.id ?? null);
  const ativos = casos.filter((c) => c.status !== "arquivado");

  if (ativos.length === 0) {
    return (
      <p className="painel p-6 text-sm text-white/45">Nenhum caso criado ainda.</p>
    );
  }

  return (
    <div className="space-y-3">
      {ativos.map((caso) => {
        const aberto = expandido === caso.id;
        return (
          <div key={caso.id} className="painel">
            <button
              onClick={() => setExpandido(aberto ? null : caso.id)}
              className="flex w-full items-center justify-between px-5 py-4 text-left"
            >
              <div>
                <span className={`rotulo ${STATUS_COR[caso.status]}`}>
                  {STATUS_ROTULO[caso.status]}
                </span>
                <p className="mt-1 text-sm text-white">{caso.titulo}</p>
              </div>
              <span className="rotulo text-white/30">
                {caso.tipo_inicial === "ishikawa" ? "Problema" : "Decisão"}
              </span>
            </button>

            {aberto && (
              <div className="space-y-5 border-t border-base-border p-5">
                <p className="text-sm text-white/60">{caso.descricao_problema}</p>

                {caso.tipo_inicial === "ishikawa" && <IshikawaView caso={caso} />}
                {caso.tipo_inicial === "swot" && <SwotView caso={caso} />}
                <CincoPorquesView caso={caso} />
                <Plano5W2HView caso={caso} />

                {caso.status === "aberto" && (
                  <form action={atualizarStatusCaso} className="pt-2">
                    <input type="hidden" name="caso_id" value={caso.id} />
                    <input type="hidden" name="status" value="resolvido" />
                    <button className="rotulo border border-positivo/50 px-4 py-2 text-positivo transition-colors hover:bg-positivo hover:text-base-bg">
                      Marcar como resolvido
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------
// ISHIKAWA
// ---------------------------------------------------------
function IshikawaView({ caso }: { caso: any }) {
  const [causas, setCausas] = useState<any[]>(
    (caso.ishikawa?.causas ?? []).map((c: any) => ({ ...c, _id: uid() }))
  );

  function atualizar(id: string, campo: string, valor: any) {
    setCausas((cs) => cs.map((c) => (c._id === id ? { ...c, [campo]: valor } : c)));
  }
  function remover(id: string) {
    setCausas((cs) => cs.filter((c) => c._id !== id));
  }
  function adicionar(categoria: string) {
    setCausas((cs) => [...cs, { _id: uid(), categoria, descricao: "", principal: false }]);
  }
  function marcarPrincipal(id: string) {
    setCausas((cs) => cs.map((c) => ({ ...c, principal: c._id === id })));
  }

  const causaPrincipal = causas.find((c) => c.principal && c.descricao?.trim());

  return (
    <div className="space-y-4">
      <p className="rotulo text-ambar">Causas possíveis do problema</p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {CATEGORIAS_ISHIKAWA.map((cat) => (
          <div key={cat.valor} className="border border-base-border p-3">
            <p className="rotulo mb-2 text-cyan">{cat.rotulo}</p>
            <div className="space-y-2">
              {causas
                .filter((c) => c.categoria === cat.valor)
                .map((c) => (
                  <div key={c._id} className="flex items-start gap-2">
                    <input
                      type="radio"
                      checked={!!c.principal}
                      onChange={() => marcarPrincipal(c._id)}
                      title="Marcar como causa principal"
                      className="mt-1.5 accent-[#D9A94C]"
                    />
                    <textarea
                      value={c.descricao}
                      onChange={(e) => atualizar(c._id, "descricao", e.target.value)}
                      rows={2}
                      className="campo flex-1 px-2 py-1.5 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => remover(c._id)}
                      className="mt-1 text-xs text-white/20 hover:text-negativo"
                    >
                      ×
                    </button>
                  </div>
                ))}
              <button
                type="button"
                onClick={() => adicionar(cat.valor)}
                className="text-xs text-cyan/60 hover:text-cyan"
              >
                + causa
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <form action={salvarIshikawa}>
          <input type="hidden" name="caso_id" value={caso.id} />
          <input
            type="hidden"
            name="causas"
            value={JSON.stringify(causas.map(({ _id, ...c }) => c))}
          />
          <button className="rotulo border border-positivo/50 px-4 py-2 text-positivo transition-colors hover:bg-positivo hover:text-base-bg">
            Salvar alterações
          </button>
        </form>

        {causas.length === 0 && (
          <form action={gerarIshikawaAction}>
            <input type="hidden" name="caso_id" value={caso.id} />
            <input type="hidden" name="problema" value={caso.descricao_problema} />
            <button className="rotulo border border-cyan px-4 py-2 text-cyan transition-colors hover:bg-cyan hover:text-base-bg">
              Sugerir causas
            </button>
          </form>
        )}

        {causaPrincipal && (
          <form action={gerarCincoPorquesAction}>
            <input type="hidden" name="caso_id" value={caso.id} />
            <input type="hidden" name="causa_origem" value={causaPrincipal.descricao} />
            <button className="rotulo border border-ambar/50 px-4 py-2 text-ambar transition-colors hover:bg-ambar hover:text-base-bg">
              Aprofundar até a causa raiz
            </button>
          </form>
        )}
      </div>

      {causaPrincipal && (
        <p className="text-xs text-white/35">
          Causa marcada: "{causaPrincipal.descricao}"
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------
// 5 PORQUÊS
// ---------------------------------------------------------
function CincoPorquesView({ caso }: { caso: any }) {
  const [dados, setDados] = useState<any>(
    caso.cinco_porques ?? { causa_origem: "", niveis: [] }
  );

  if (!caso.cinco_porques) return null;

  function atualizarNivel(i: number, valor: string) {
    setDados((d: any) => ({
      ...d,
      niveis: d.niveis.map((n: any, idx: number) =>
        idx === i ? { ...n, resposta: valor } : n
      ),
    }));
  }

  const ultimaResposta = dados.niveis[dados.niveis.length - 1]?.resposta?.trim() ?? "";

  return (
    <div className="space-y-3 border-t border-base-border pt-5">
      <p className="rotulo text-ambar">Caminho até a raiz — {dados.causa_origem}</p>

      {dados.niveis.map((n: any, i: number) => (
        <div key={i} className="flex items-start gap-3">
          <span className="rotulo mt-2 w-8 shrink-0 text-white/30">{i + 1}º</span>
          <div className="flex-1">
            <p className="text-xs text-white/45">{n.pergunta}</p>
            <textarea
              value={n.resposta}
              onChange={(e) => atualizarNivel(i, e.target.value)}
              rows={1}
              className="campo mt-1 w-full px-3 py-1.5 text-sm"
            />
          </div>
        </div>
      ))}

      <div className="flex flex-wrap gap-3 pt-1">
        <form action={salvarCincoPorques}>
          <input type="hidden" name="caso_id" value={caso.id} />
          <input type="hidden" name="dados" value={JSON.stringify(dados)} />
          <button className="rotulo border border-positivo/50 px-4 py-2 text-positivo transition-colors hover:bg-positivo hover:text-base-bg">
            Salvar
          </button>
        </form>

        {ultimaResposta && (
          <form action={gerarPlano5W2HAction}>
            <input type="hidden" name="caso_id" value={caso.id} />
            <input type="hidden" name="causa_raiz" value={ultimaResposta} />
            <button className="rotulo border border-cyan px-4 py-2 text-cyan transition-colors hover:bg-cyan hover:text-base-bg">
              Criar plano de ação
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------
// 5W2H
// ---------------------------------------------------------
const CAMPOS_5W2H = [
  { chave: "o_que", rotulo: "O quê" },
  { chave: "por_que", rotulo: "Por quê" },
  { chave: "onde", rotulo: "Onde" },
  { chave: "quando", rotulo: "Quando" },
  { chave: "quem", rotulo: "Quem" },
  { chave: "como", rotulo: "Como" },
  { chave: "quanto_custa", rotulo: "Quanto custa" },
];

const STATUS_ACAO_ROTULO: Record<string, string> = {
  pendente: "Pendente",
  em_andamento: "Em andamento",
  concluido: "Concluído",
};

function Plano5W2HView({ caso }: { caso: any }) {
  const [acoes, setAcoes] = useState<any[]>(
    (caso.plano_5w2h ?? []).map((a: any) => ({ ...a, _id: uid() }))
  );

  if (acoes.length === 0 && !caso.cinco_porques) return null;

  function atualizar(id: string, campo: string, valor: string) {
    setAcoes((as) => as.map((a) => (a._id === id ? { ...a, [campo]: valor } : a)));
  }
  function remover(id: string) {
    setAcoes((as) => as.filter((a) => a._id !== id));
  }

  return (
    <div className="space-y-3 border-t border-base-border pt-5">
      <p className="rotulo text-cyan">Plano de ação</p>

      {acoes.map((a) => (
        <div key={a._id} className="border border-base-border p-4">
          <div className="grid gap-2 sm:grid-cols-2">
            {CAMPOS_5W2H.map((campo) => (
              <label key={campo.chave} className="block">
                <span className="rotulo mb-1 block text-white/35">{campo.rotulo}</span>
                <input
                  value={a[campo.chave] ?? ""}
                  onChange={(e) => atualizar(a._id, campo.chave, e.target.value)}
                  className="campo w-full px-2 py-1.5 text-xs"
                />
              </label>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between">
            <select
              value={a.status}
              onChange={(e) => atualizar(a._id, "status", e.target.value)}
              className="campo px-2 py-1 text-xs"
            >
              {Object.entries(STATUS_ACAO_ROTULO).map(([v, r]) => (
                <option key={v} value={v}>
                  {r}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => remover(a._id)}
              className="text-xs text-negativo/70 hover:text-negativo"
            >
              remover ação
            </button>
          </div>
        </div>
      ))}

      {acoes.length === 0 && (
        <p className="text-sm text-white/35">Nenhuma ação gerada ainda.</p>
      )}

      <form action={salvarPlano5W2H}>
        <input type="hidden" name="caso_id" value={caso.id} />
        <input
          type="hidden"
          name="acoes"
          value={JSON.stringify(acoes.map(({ _id, ...a }) => a))}
        />
        <button className="rotulo border border-positivo/50 px-4 py-2 text-positivo transition-colors hover:bg-positivo hover:text-base-bg">
          Salvar plano
        </button>
      </form>
    </div>
  );
}

// ---------------------------------------------------------
// SWOT
// ---------------------------------------------------------
const QUADRANTES_SWOT = [
  { chave: "forcas", rotulo: "Forças", cor: "text-positivo" },
  { chave: "fraquezas", rotulo: "Fraquezas", cor: "text-negativo" },
  { chave: "oportunidades", rotulo: "Oportunidades", cor: "text-cyan" },
  { chave: "ameacas", rotulo: "Ameaças", cor: "text-alerta" },
];

function SwotView({ caso }: { caso: any }) {
  const [swot, setSwot] = useState<any>(
    caso.swot ?? { forcas: [], fraquezas: [], oportunidades: [], ameacas: [] }
  );

  if (!caso.swot) return null;

  function atualizarItem(quadrante: string, i: number, valor: string) {
    setSwot((s: any) => ({
      ...s,
      [quadrante]: s[quadrante].map((v: string, idx: number) => (idx === i ? valor : v)),
    }));
  }
  function remover(quadrante: string, i: number) {
    setSwot((s: any) => ({
      ...s,
      [quadrante]: s[quadrante].filter((_: any, idx: number) => idx !== i),
    }));
  }
  function adicionar(quadrante: string) {
    setSwot((s: any) => ({ ...s, [quadrante]: [...s[quadrante], ""] }));
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {QUADRANTES_SWOT.map((q) => (
          <div key={q.chave} className="border border-base-border p-3">
            <p className={`rotulo mb-2 ${q.cor}`}>{q.rotulo}</p>
            <div className="space-y-1.5">
              {(swot[q.chave] ?? []).map((item: string, i: number) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    value={item}
                    onChange={(e) => atualizarItem(q.chave, i, e.target.value)}
                    className="campo flex-1 px-2 py-1.5 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => remover(q.chave, i)}
                    className="text-xs text-white/20 hover:text-negativo"
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => adicionar(q.chave)}
                className="text-xs text-cyan/60 hover:text-cyan"
              >
                + item
              </button>
            </div>
          </div>
        ))}
      </div>

      <form action={salvarSwot}>
        <input type="hidden" name="caso_id" value={caso.id} />
        <input type="hidden" name="swot" value={JSON.stringify(swot)} />
        <button className="rotulo border border-positivo/50 px-4 py-2 text-positivo transition-colors hover:bg-positivo hover:text-base-bg">
          Salvar
        </button>
      </form>
    </div>
  );
}
