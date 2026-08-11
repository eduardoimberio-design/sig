"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { resgatarVoucher, type EstadoForm } from "@/app/actions/auth";
import { Campo, BotaoSubmit, Alerta } from "@/components/ui";

const estadoInicial: EstadoForm = {};

interface Plano {
  id: string;
  nome: string;
  descricao: string | null;
  duracao_dias: number;
  preco: number;
}

export function ListaPlanos({ planos }: { planos: Plano[] }) {
  const [carregando, setCarregando] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function contratar(planoId: string) {
    setCarregando(planoId);
    setErro(null);

    try {
      const res = await fetch("/api/pagamentos/criar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plano_id: planoId }),
      });

      const dados = await res.json();

      if (!res.ok) {
        setErro(dados.erro ?? "Falha ao gerar o pagamento.");
        setCarregando(null);
        return;
      }

      window.location.href = dados.url;
    } catch {
      setErro("Erro de conexão. Tente novamente.");
      setCarregando(null);
    }
  }

  return (
    <div className="mt-4 space-y-3">
      {erro && <Alerta tipo="erro">{erro}</Alerta>}

      {planos.map((plano) => (
        <div
          key={plano.id}
          className="flex flex-wrap items-center justify-between gap-4 rounded-sm
                     border border-base-border bg-base-surface p-5"
        >
          <div>
            <p className="titulo text-lg text-ambar">{plano.nome}</p>
            <p className="text-sm text-white/50">
              {plano.descricao ?? `${plano.duracao_dias} dias de acesso`}
            </p>
          </div>

          <div className="flex items-center gap-5">
            <span className="text-lg">
              {Number(plano.preco).toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </span>
            <button
              onClick={() => contratar(plano.id)}
              disabled={carregando !== null}
              className="rounded-sm border border-cyan px-5 py-2 text-sm text-cyan
                         transition-colors hover:bg-cyan hover:text-white
                         disabled:opacity-40"
            >
              {carregando === plano.id ? "Gerando..." : "Contratar"}
            </button>
          </div>
        </div>
      ))}

      <p className="pt-1 text-xs text-white/30">
        Pagamento via Pix ou cartão de crédito, processado pela InfinitePay.
      </p>
    </div>
  );
}

export function FormVoucher() {
  const [estado, acao] = useFormState(resgatarVoucher, estadoInicial);

  return (
    <form action={acao} className="mt-4 space-y-3">
      {estado.erro && <Alerta tipo="erro">{estado.erro}</Alerta>}
      {estado.sucesso && <Alerta tipo="sucesso">{estado.sucesso}</Alerta>}

      <Campo label="Código do voucher" name="codigo" placeholder="SIG-XXXX-XXXX" />

      <div className="max-w-xs">
        <BotaoSubmit>Resgatar</BotaoSubmit>
      </div>
    </form>
  );
}
