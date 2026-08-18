"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function BotaoGerarAgora() {
  const [rodando, setRodando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const router = useRouter();

  async function gerar() {
    setRodando(true);
    setErro(null);
    try {
      const r = await fetch("/api/cron/sentinela", { method: "POST" });
      if (!r.ok) {
        const dados = await r.json().catch(() => ({}));
        setErro(dados?.erro ?? "Não consegui gerar agora.");
      } else {
        router.refresh();
      }
    } catch {
      setErro("Falha de conexão.");
    } finally {
      setRodando(false);
    }
  }

  return (
    <div className="shrink-0 text-right">
      <button
        onClick={gerar}
        disabled={rodando}
        className="rotulo border border-cyan/50 px-4 py-2 text-xs text-cyan
                   transition-colors hover:bg-cyan hover:text-base-bg disabled:opacity-40"
      >
        {rodando ? "Analisando…" : "Gerar agora"}
      </button>
      {erro && <p className="mt-2 text-xs text-negativo">{erro}</p>}
    </div>
  );
}

export function MarcarResumoLido({ id }: { id: string }) {
  const [marcando, setMarcando] = useState(false);
  const router = useRouter();

  async function marcar() {
    setMarcando(true);
    try {
      await fetch("/api/sentinela/lido", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      router.refresh();
    } finally {
      setMarcando(false);
    }
  }

  return (
    <button
      onClick={marcar}
      disabled={marcando}
      className="rotulo mt-5 border border-base-border px-4 py-2 text-xs
                 text-white/50 transition-colors hover:border-cyan hover:text-cyan"
    >
      {marcando ? "…" : "Marcar como lido"}
    </button>
  );
}
