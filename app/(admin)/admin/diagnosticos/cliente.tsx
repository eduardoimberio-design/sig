"use client";

// app/(admin)/admin/diagnosticos/cliente.tsx

import { useState, useTransition } from "react";
import {
  atualizarStatusLeadDiagnostico,
  excluirLeadDiagnostico,
} from "@/app/actions/admin-diagnosticos";

interface StatusLeadSelectProps {
  leadId: string;
  statusAtual: string;
  opcoes: Record<string, string>;
}

export function StatusLeadSelect({ leadId, statusAtual, opcoes }: StatusLeadSelectProps) {
  const [isPending, startTransition] = useTransition();
  const [valor, setValor] = useState(statusAtual);
  const [erro, setErro] = useState(false);

  function handleChange(novoStatus: string) {
    const anterior = valor;
    setValor(novoStatus);
    setErro(false);

    startTransition(async () => {
      try {
        await atualizarStatusLeadDiagnostico(leadId, novoStatus);
      } catch {
        setErro(true);
        setValor(anterior);
      }
    });
  }

  return (
    <div>
      <select
        value={valor}
        disabled={isPending}
        onChange={(e) => handleChange(e.target.value)}
        className="rotulo border border-base-border bg-base-bg px-2 py-1.5 text-xs text-white outline-none focus:border-cyan"
      >
        {Object.entries(opcoes).map(([valorOpcao, label]) => (
          <option key={valorOpcao} value={valorOpcao}>
            {label}
          </option>
        ))}
      </select>
      {erro && <p className="mt-1 text-[10px] text-alerta">Erro ao salvar</p>}
    </div>
  );
}

interface ExcluirLeadButtonProps {
  leadId: string;
  nomeLead: string;
}

export function ExcluirLeadButton({ leadId, nomeLead }: ExcluirLeadButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState(false);
  const [confirmando, setConfirmando] = useState(false);

  function handleExcluir() {
    setErro(false);
    startTransition(async () => {
      try {
        await excluirLeadDiagnostico(leadId);
      } catch {
        setErro(true);
        setConfirmando(false);
      }
    });
  }

  if (confirmando) {
    return (
      <div className="flex flex-col items-start gap-1.5">
        <p className="text-[10px] text-white/50">Excluir {nomeLead}?</p>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={isPending}
            onClick={handleExcluir}
            className="rotulo border border-alerta px-2 py-1 text-[10px] text-alerta hover:bg-alerta/10"
          >
            {isPending ? "Excluindo..." : "Confirmar"}
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => setConfirmando(false)}
            className="rotulo border border-base-border px-2 py-1 text-[10px] text-white/50 hover:text-white/80"
          >
            Cancelar
          </button>
        </div>
        {erro && <p className="text-[10px] text-alerta">Erro ao excluir</p>}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirmando(true)}
      className="rotulo text-[10px] text-white/30 hover:text-alerta"
      title="Excluir lead"
    >
      Excluir
    </button>
  );
}
