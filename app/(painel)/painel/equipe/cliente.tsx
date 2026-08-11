"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import {
  adicionarEscala,
  removerEscala,
  registrarAusencia,
  removerAusencia,
  registrarTreinamento,
  type EstadoForm,
} from "@/app/actions/equipe";
import { Alerta } from "@/components/ui";
import { data as fmtData } from "@/lib/formatters";

const estadoInicial: EstadoForm = {};

const DIAS = [
  { valor: "seg", rotulo: "Seg" },
  { valor: "ter", rotulo: "Ter" },
  { valor: "qua", rotulo: "Qua" },
  { valor: "qui", rotulo: "Qui" },
  { valor: "sex", rotulo: "Sex" },
  { valor: "sab", rotulo: "Sáb" },
  { valor: "dom", rotulo: "Dom" },
];

const TURNOS = [
  { valor: "manha", rotulo: "Manhã" },
  { valor: "tarde", rotulo: "Tarde" },
  { valor: "noite", rotulo: "Noite" },
];

interface Colaborador {
  id: string;
  nome: string;
  funcao: string;
}

interface Escala {
  id: string;
  colaborador_id: string;
  dia_semana: string;
  turno: string;
  horario_entrada: string | null;
  horario_saida: string | null;
}

// ---------------------------------------------------------
// GRADE DE ESCALA
// ---------------------------------------------------------
export function GradeEscala({
  colaboradores,
  escala,
}: {
  colaboradores: Colaborador[];
  escala: Escala[];
}) {
  const [estado, acao] = useFormState(adicionarEscala, estadoInicial);
  const [aberto, setAberto] = useState(escala.length === 0);

  const nomePorId = new Map(colaboradores.map((c) => [c.id, c.nome]));

  const turnosSemCobertura = TURNOS.flatMap((t) =>
    DIAS.filter(
      (d) =>
        !escala.some((e) => e.dia_semana === d.valor && e.turno === t.valor)
    ).map((d) => `${d.rotulo} · ${t.rotulo}`)
  );

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs text-white/40">
          {turnosSemCobertura.length} de {DIAS.length * TURNOS.length} turnos
          sem ninguém escalado
        </p>
        <button
          onClick={() => setAberto(!aberto)}
          className="rotulo border border-base-border px-3 py-1.5 text-white/50 hover:text-white/80"
        >
          {aberto ? "Fechar" : "+ Escalar colaborador"}
        </button>
      </div>

      {aberto && (
        <form action={acao} className="painel mb-4 flex flex-wrap items-end gap-3 p-5">
          {estado.erro && (
            <div className="w-full">
              <Alerta tipo="erro">{estado.erro}</Alerta>
            </div>
          )}

          <label className="block">
            <span className="rotulo mb-2 block text-white/45">Colaborador</span>
            <select name="colaborador_id" required className="campo px-3 py-2 text-sm">
              <option value="">Selecione</option>
              {colaboradores.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome} — {c.funcao}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="rotulo mb-2 block text-white/45">Dia</span>
            <select name="dia_semana" required className="campo px-3 py-2 text-sm">
              {DIAS.map((d) => (
                <option key={d.valor} value={d.valor}>
                  {d.rotulo}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="rotulo mb-2 block text-white/45">Turno</span>
            <select name="turno" required className="campo px-3 py-2 text-sm">
              {TURNOS.map((t) => (
                <option key={t.valor} value={t.valor}>
                  {t.rotulo}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="rotulo mb-2 block text-white/45">Entrada</span>
            <input type="time" name="horario_entrada" className="campo px-3 py-2 text-sm" />
          </label>

          <label className="block">
            <span className="rotulo mb-2 block text-white/45">Saída</span>
            <input type="time" name="horario_saida" className="campo px-3 py-2 text-sm" />
          </label>

          <button className="rotulo border border-cyan bg-cyan/10 px-4 py-2 text-cyan hover:bg-cyan hover:text-base-bg">
            Adicionar
          </button>
        </form>
      )}

      <div className="painel overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-base-border">
              <th className="rotulo px-3 py-3 text-left font-normal text-white/40">
                Turno
              </th>
              {DIAS.map((d) => (
                <th key={d.valor} className="rotulo px-3 py-3 text-left font-normal text-white/40">
                  {d.rotulo}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TURNOS.map((t) => (
              <tr key={t.valor} className="border-b border-base-border last:border-0">
                <td className="rotulo px-3 py-3 text-cyan">{t.rotulo}</td>
                {DIAS.map((d) => {
                  const itens = escala.filter(
                    (e) => e.dia_semana === d.valor && e.turno === t.valor
                  );
                  return (
                    <td key={d.valor} className="px-3 py-3 align-top">
                      <div className="space-y-1.5">
                        {itens.map((e) => (
                          <div
                            key={e.id}
                            className="group flex items-center justify-between gap-2 border border-base-border px-2 py-1 text-xs"
                          >
                            <span className="text-white/75">
                              {nomePorId.get(e.colaborador_id) ?? "—"}
                            </span>
                            <form action={removerEscala}>
                              <input type="hidden" name="id" value={e.id} />
                              <button className="text-white/20 hover:text-negativo">
                                ×
                              </button>
                            </form>
                          </div>
                        ))}
                        {itens.length === 0 && (
                          <span className="text-xs text-white/20">—</span>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------
// AUSÊNCIAS
// ---------------------------------------------------------
const TIPO_ROTULO: Record<string, string> = {
  folga: "Folga",
  ferias: "Férias",
  atestado: "Atestado",
  falta: "Falta",
};

const TIPO_COR: Record<string, string> = {
  folga: "text-white/50",
  ferias: "text-cyan",
  atestado: "text-alerta",
  falta: "text-negativo",
};

export function PainelAusencias({
  colaboradores,
  ausencias,
}: {
  colaboradores: Colaborador[];
  ausencias: any[];
}) {
  const [estado, acao] = useFormState(registrarAusencia, estadoInicial);
  const [aberto, setAberto] = useState(false);

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button
          onClick={() => setAberto(!aberto)}
          className="rotulo border border-base-border px-3 py-1.5 text-white/50 hover:text-white/80"
        >
          {aberto ? "Fechar" : "+ Registrar ausência"}
        </button>
      </div>

      {aberto && (
        <form action={acao} className="painel mb-4 flex flex-wrap items-end gap-3 p-5">
          {estado.erro && (
            <div className="w-full">
              <Alerta tipo="erro">{estado.erro}</Alerta>
            </div>
          )}
          {estado.sucesso && (
            <div className="w-full">
              <Alerta tipo="sucesso">{estado.sucesso}</Alerta>
            </div>
          )}

          <label className="block">
            <span className="rotulo mb-2 block text-white/45">Colaborador</span>
            <select name="colaborador_id" required className="campo px-3 py-2 text-sm">
              <option value="">Selecione</option>
              {colaboradores.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="rotulo mb-2 block text-white/45">Data</span>
            <input type="date" name="data" required className="campo px-3 py-2 text-sm" />
          </label>

          <label className="block">
            <span className="rotulo mb-2 block text-white/45">Tipo</span>
            <select name="tipo" className="campo px-3 py-2 text-sm">
              <option value="folga">Folga</option>
              <option value="ferias">Férias</option>
              <option value="atestado">Atestado</option>
              <option value="falta">Falta</option>
            </select>
          </label>

          <label className="block flex-1 min-w-[200px]">
            <span className="rotulo mb-2 block text-white/45">Observação</span>
            <input
              name="observacoes"
              placeholder="Opcional"
              className="campo w-full px-3 py-2 text-sm"
            />
          </label>

          <button className="rotulo border border-cyan bg-cyan/10 px-4 py-2 text-cyan hover:bg-cyan hover:text-base-bg">
            Registrar
          </button>
        </form>
      )}

      {ausencias.length > 0 ? (
        <div className="space-y-2">
          {ausencias.map((a) => {
            const passada = a.data < new Date().toISOString().slice(0, 10);
            return (
            <div
              key={a.id}
              className={`flex items-center justify-between border border-base-border px-4 py-2.5 text-sm ${
                passada ? "opacity-55" : ""
              }`}
            >
              <div>
                <span className="text-white">{a.colaboradores?.nome ?? "—"}</span>
                <span className={`ml-3 rotulo ${TIPO_COR[a.tipo]}`}>
                  {TIPO_ROTULO[a.tipo]}
                </span>
                {a.observacoes && (
                  <span className="ml-3 text-xs text-white/35">{a.observacoes}</span>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-white/40">
                <span>{fmtData(a.data)}</span>
                <form action={removerAusencia}>
                  <input type="hidden" name="id" value={a.id} />
                  <button className="text-negativo/70 hover:text-negativo">
                    remover
                  </button>
                </form>
              </div>
            </div>
            );
          })}
        </div>
      ) : (
        <p className="painel p-6 text-sm text-white/45">
          Nenhuma ausência registrada nos últimos 30 dias.
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------
// TREINAMENTOS
// ---------------------------------------------------------
export function PainelTreinamentos({
  colaboradores,
  treinamentos,
  participantesMap,
}: {
  colaboradores: Colaborador[];
  treinamentos: any[];
  participantesMap: Record<string, string[]>;
}) {
  const [estado, acao] = useFormState(registrarTreinamento, estadoInicial);
  const [aberto, setAberto] = useState(treinamentos.length === 0);
  const [selecionados, setSelecionados] = useState<string[]>([]);

  function toggle(id: string) {
    setSelecionados((s) => (s.includes(id) ? s.filter((v) => v !== id) : [...s, id]));
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button
          onClick={() => setAberto(!aberto)}
          className="rotulo border border-base-border px-3 py-1.5 text-white/50 hover:text-white/80"
        >
          {aberto ? "Fechar" : "+ Registrar treinamento"}
        </button>
      </div>

      {aberto && (
        <form action={acao} className="painel mb-4 space-y-4 p-6">
          {estado.erro && <Alerta tipo="erro">{estado.erro}</Alerta>}
          {estado.sucesso && <Alerta tipo="sucesso">{estado.sucesso}</Alerta>}

          <input type="hidden" name="participantes" value={selecionados.join(",")} />

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="rotulo mb-2 block text-white/45">Título</span>
              <input
                name="titulo"
                required
                placeholder="Ex.: Segurança alimentar"
                className="campo w-full px-4 py-2.5 text-sm"
              />
            </label>
            <label className="block">
              <span className="rotulo mb-2 block text-white/45">Data</span>
              <input
                type="date"
                name="data_realizacao"
                required
                className="campo w-full px-4 py-2.5 text-sm"
              />
            </label>
          </div>

          <label className="block max-w-[200px]">
            <span className="rotulo mb-2 block text-white/45">Carga horária</span>
            <input
              name="carga_horas"
              type="number"
              step="0.5"
              placeholder="Ex.: 4"
              className="campo w-full px-4 py-2.5 text-sm"
            />
          </label>

          <label className="block">
            <span className="rotulo mb-2 block text-white/45">Descrição</span>
            <textarea
              name="descricao"
              rows={2}
              className="campo w-full px-4 py-2.5 text-sm"
            />
          </label>

          <div>
            <span className="rotulo mb-2 block text-white/45">Participantes</span>
            <div className="flex flex-wrap gap-2">
              {colaboradores.map((c) => {
                const ativo = selecionados.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggle(c.id)}
                    className={`rotulo border px-3 py-1.5 transition-colors ${
                      ativo
                        ? "border-cyan bg-cyan/10 text-cyan"
                        : "border-base-border text-white/45 hover:text-white/70"
                    }`}
                  >
                    {c.nome}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="max-w-xs">
            <button className="rotulo w-full border border-cyan bg-cyan/10 px-6 py-3 text-cyan hover:bg-cyan hover:text-base-bg">
              Registrar treinamento
            </button>
          </div>
        </form>
      )}

      {treinamentos.length > 0 ? (
        <div className="space-y-2">
          {treinamentos.map((t) => (
            <div key={t.id} className="painel p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm text-white">{t.titulo}</p>
                <span className="rotulo text-white/35">
                  {fmtData(t.data_realizacao)}
                </span>
              </div>
              {t.descricao && (
                <p className="mt-1 text-sm text-white/50">{t.descricao}</p>
              )}
              {participantesMap[t.id]?.length > 0 && (
                <p className="mt-2 text-xs text-cyan/70">
                  {participantesMap[t.id].join(", ")}
                </p>
              )}
            </div>
          ))}
        </div>
      ) : (
        !aberto && (
          <p className="painel p-6 text-sm text-white/45">
            Nenhum treinamento registrado ainda.
          </p>
        )
      )}
    </div>
  );
}
