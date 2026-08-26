"use client";

// app/admin/diagnosticos/StatusSelect.tsx
//
// Dropdown inline pra mudar a etapa do lead no funil sem sair da tabela.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface StatusSelectProps {
  leadId: string;
  statusAtual: string;
  opcoes: Record<string, string>;
}

export function StatusSelect({ leadId, statusAtual, opcoes }: StatusSelectProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [valor, setValor] = useState(statusAtual);
  const [erro, setErro] = useState(false);

  async function handleChange(novoStatus: string) {
    setValor(novoStatus);
    setErro(false);

    try {
      const resp = await fetch(`/api/admin/diagnosticos/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: novoStatus }),
      });

      if (!resp.ok) throw new Error("Falha ao atualizar");

      startTransition(() => {
        router.refresh();
      });
    } catch {
      setErro(true);
      setValor(statusAtual);
    }
  }

  return (
    <div>
      <select
        value={valor}
        disabled={isPending}
        onChange={(e) => handleChange(e.target.value)}
        style={{ fontFamily: "IBM Plex Mono, monospace" }}
        className="bg-[#0A1420] border border-[#4EC5DC]/20 text-[#E8EEF3] text-xs px-2 py-1.5 rounded-sm outline-none focus:border-[#4EC5DC]"
      >
        {Object.entries(opcoes).map(([valorOpcao, label]) => (
          <option key={valorOpcao} value={valorOpcao}>
            {label}
          </option>
        ))}
      </select>
      {erro && <p className="text-[#E4756B] text-[10px] mt-1">Erro ao salvar</p>}
    </div>
  );
}
