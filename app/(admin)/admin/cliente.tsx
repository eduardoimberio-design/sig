"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import {
  gerarVouchers,
  concederAcesso,
  type EstadoForm,
} from "@/app/actions/admin";
import { Alerta } from "@/components/ui";
import { moeda, data as fmtData } from "@/lib/formatters";

const estadoInicial: EstadoForm = {};

// ---------------------------------------------------------
// EMPRESAS
// ---------------------------------------------------------
export function ListaEmpresas({ empresas }: { empresas: any[] }) {
  const [expandida, setExpandida] = useState<string | null>(null);

  if (empresas.length === 0) {
    return (
      <p className="painel p-6 text-sm text-white/45">
        Nenhuma empresa cadastrada ainda.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {empresas.map((e) => {
        const aberta = expandida === e.id;
        const expirandoEmBreve =
          !e.acesso_vitalicio && e.tem_acesso && e.dias_restantes <= 7;

        return (
          <div key={e.id} className="painel">
            <button
              onClick={() => setExpandida(aberta ? null : e.id)}
              className="flex w-full flex-wrap items-center justify-between gap-3 px-5 py-4 text-left"
            >
              <div>
                <p className="text-sm text-white">{e.nome}</p>
                <p className="mt-0.5 text-xs text-white/35">
                  {e.qtd_usuarios} usuário{e.qtd_usuarios === 1 ? "" : "s"} ·
                  cadastrada em {fmtData(e.created_at)}
                </p>
              </div>

              <div className="flex items-center gap-5 text-xs">
                <span className="cifra text-white/50">
                  {moeda(e.total_pago)}
                </span>
                <span
                  className={`rotulo ${
                    e.acesso_vitalicio
                      ? "text-ambar"
                      : !e.tem_acesso
                        ? "text-negativo"
                        : expirandoEmBreve
                          ? "text-alerta"
                          : "text-positivo"
                  }`}
                >
                  {e.acesso_vitalicio
                    ? "Vitalício"
                    : !e.tem_acesso
                      ? "Sem acesso"
                      : `${e.dias_restantes} dias`}
                </span>
              </div>
            </button>

            {aberta && (
              <div className="border-t border-base-border p-5">
                <FormConcederAcesso empresaId={e.id} nome={e.nome} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function FormConcederAcesso({
  empresaId,
  nome,
}: {
  empresaId: string;
  nome: string;
}) {
  const [estado, acao] = useFormState(concederAcesso, estadoInicial);

  return (
    <form action={acao} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="empresa_id" value={empresaId} />

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
        <span className="rotulo mb-2 block text-white/45">
          Conceder acesso a {nome}
        </span>
        <select name="dias" className="campo px-3 py-2 text-sm">
          <option value="30">30 dias</option>
          <option value="60">60 dias</option>
          <option value="90">90 dias</option>
          <option value="180">180 dias</option>
          <option value="365">365 dias</option>
          <option value="vitalicio">Vitalício</option>
        </select>
      </label>

      <button className="rotulo border border-cyan bg-cyan/10 px-4 py-2 text-cyan transition-colors hover:bg-cyan hover:text-base-bg">
        Conceder
      </button>

      <p className="w-full text-xs text-white/35">
        Use para venda fechada fora do sistema. O prazo é somado ao que já
        existe, nunca substitui.
      </p>
    </form>
  );
}

// ---------------------------------------------------------
// VOUCHERS
// ---------------------------------------------------------
export function FormVouchers() {
  const [estado, acao] = useFormState(gerarVouchers, estadoInicial);
  const [copiado, setCopiado] = useState(false);

  function copiarTodos() {
    if (!estado.codigos) return;
    navigator.clipboard.writeText(estado.codigos.join("\n"));
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <div className="space-y-4">
      <form action={acao} className="painel flex flex-wrap items-end gap-3 p-5">
        {estado.erro && (
          <div className="w-full">
            <Alerta tipo="erro">{estado.erro}</Alerta>
          </div>
        )}

        <label className="block">
          <span className="rotulo mb-2 block text-white/45">Quantidade</span>
          <input
            name="quantidade"
            type="number"
            min={1}
            max={100}
            defaultValue={1}
            className="campo w-24 px-3 py-2 text-sm"
          />
        </label>

        <label className="block">
          <span className="rotulo mb-2 block text-white/45">Duração</span>
          <select name="tipo" className="campo px-3 py-2 text-sm">
            <option value="30">30 dias</option>
            <option value="60">60 dias</option>
            <option value="90">90 dias</option>
            <option value="vitalicio">Vitalício</option>
          </select>
        </label>

        <label className="block flex-1 min-w-[220px]">
          <span className="rotulo mb-2 block text-white/45">Descrição</span>
          <input
            name="descricao"
            required
            placeholder="Ex.: Parceria Chef Gourmet - turma 2026"
            className="campo w-full px-3 py-2 text-sm"
          />
        </label>

        <label className="block">
          <span className="rotulo mb-2 block text-white/45">
            Válido até (opcional)
          </span>
          <input type="date" name="validade_resgate" className="campo px-3 py-2 text-sm" />
        </label>

        <button className="rotulo border border-cyan bg-cyan/10 px-5 py-2.5 text-cyan transition-colors hover:bg-cyan hover:text-base-bg">
          Gerar
        </button>
      </form>

      {estado.codigos && estado.codigos.length > 0 && (
        <div className="painel painel-destaque p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="rotulo text-positivo">
              {estado.codigos.length} voucher(s) gerado(s)
            </p>
            <button
              onClick={copiarTodos}
              className="rotulo border border-base-border px-3 py-1.5 text-white/50 hover:text-white/80"
            >
              {copiado ? "Copiado!" : "Copiar todos"}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {estado.codigos.map((c) => (
              <span key={c} className="cifra border border-cyan/30 bg-cyan/5 px-3 py-1.5 text-sm text-cyan">
                {c}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const STATUS_VOUCHER_ROTULO: Record<string, string> = {
  disponivel: "Disponível",
  usado: "Usado",
  cancelado: "Cancelado",
  expirado: "Expirado",
};

const STATUS_VOUCHER_COR: Record<string, string> = {
  disponivel: "text-positivo",
  usado: "text-white/35",
  cancelado: "text-negativo",
  expirado: "text-alerta",
};

export function ListaVouchers({ vouchers }: { vouchers: any[] }) {
  const [mostrarUsados, setMostrarUsados] = useState(false);

  const visiveis = mostrarUsados
    ? vouchers
    : vouchers.filter((v) => v.status === "disponivel");

  if (vouchers.length === 0) {
    return (
      <p className="painel p-6 text-sm text-white/45">
        Nenhum voucher emitido ainda.
      </p>
    );
  }

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <button
          onClick={() => setMostrarUsados(!mostrarUsados)}
          className="rotulo text-cyan hover:underline"
        >
          {mostrarUsados ? "Mostrar só disponíveis" : "Mostrar todos"}
        </button>
      </div>

      <div className="painel overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-base-border text-left">
              <th className="rotulo px-4 py-3 font-normal text-white/40">Código</th>
              <th className="rotulo px-4 py-3 font-normal text-white/40">Duração</th>
              <th className="rotulo px-4 py-3 font-normal text-white/40">Descrição</th>
              <th className="rotulo px-4 py-3 font-normal text-white/40">Status</th>
              <th className="rotulo px-4 py-3 font-normal text-white/40">Resgatado por</th>
            </tr>
          </thead>
          <tbody>
            {visiveis.map((v) => (
              <tr key={v.id} className="border-b border-base-border last:border-0">
                <td className="cifra px-4 py-3 text-cyan">{v.codigo}</td>
                <td className="px-4 py-3 text-white/60">
                  {v.vitalicio ? "Vitalício" : `${v.duracao_dias} dias`}
                </td>
                <td className="px-4 py-3 text-white/50">{v.descricao ?? "—"}</td>
                <td className={`rotulo px-4 py-3 ${STATUS_VOUCHER_COR[v.status]}`}>
                  {STATUS_VOUCHER_ROTULO[v.status]}
                </td>
                <td className="px-4 py-3 text-white/50">
                  {v.empresa_resgate ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {visiveis.length === 0 && (
        <p className="mt-3 text-sm text-white/35">
          Nenhum voucher disponível — todos já foram resgatados.
        </p>
      )}
    </div>
  );
}
