"use client";

// app/(admin)/admin/diagnosticos/cliente.tsx
//
// Client component do dropdown de status. Chama a Server Action diretamente
// (padrão Next.js), sem precisar de nenhuma API route intermediária.

import { useState, useTransition } from "react";
import { atualizarStatusLeadDiagnostico } from "@/app/actions/admin-diagnosticos";

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
