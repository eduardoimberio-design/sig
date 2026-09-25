"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { salvarDadosAfiliado, type EstadoForm } from "@/app/actions/afiliados";
import { Alerta, BotaoSubmit } from "@/components/ui";

const estadoInicial: EstadoForm = {};

export function CopiarLink({ link, codigo }: { link: string; codigo: string }) {
  const [copiado, setCopiado] = useState<"link" | "codigo" | null>(null);

  async function copiar(texto: string, qual: "link" | "codigo") {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(qual);
      setTimeout(() => setCopiado(null), 2000);
    } catch {
      // Clipboard bloqueado: o texto continua visível para copiar à mão.
    }
  }

  return (
    <div className="mt-3 space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <code className="break-all border border-base-border bg-base-bg px-3 py-2 text-sm text-white/80">
          {link}
        </code>
        <button
          type="button"
          onClick={() => copiar(link, "link")}
          className="rotulo border border-cyan/50 px-4 py-2 text-xs text-cyan
                     transition-colors hover:bg-cyan hover:text-base-bg"
        >
          {copiado === "link" ? "Copiado" : "Copiar link"}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-white/45">Código:</span>
        <code className="cifra border border-ambar/40 px-3 py-1 text-ambar">
          {codigo}
        </code>
        <button
          type="button"
          onClick={() => copiar(codigo, "codigo")}
          className="text-xs text-white/40 underline hover:text-cyan"
        >
          {copiado === "codigo" ? "copiado" : "copiar"}
        </button>
      </div>
    </div>
  );
}

export function FormDadosAfiliado({ afiliado }: { afiliado: any }) {
  const [estado, acao] = useFormState(salvarDadosAfiliado, estadoInicial);

  const faltaPix = !afiliado.chave_pix;

  return (
    <form action={acao} className="painel p-6">
      <p className="rotulo mb-1 text-cyan">Dados para repasse</p>
      <p className="mb-5 text-sm text-white/45">
        A comissão é paga por Pix. Sem chave cadastrada, o repasse fica
        retido.
      </p>

      {faltaPix && (
        <p className="mb-4 border-l-2 border-alerta pl-3 text-sm text-alerta">
          Falta cadastrar sua chave Pix.
        </p>
      )}

      {estado.erro && (
        <div className="mb-4">
          <Alerta tipo="erro">{estado.erro}</Alerta>
        </div>
      )}
      {estado.sucesso && (
        <div className="mb-4">
          <Alerta tipo="sucesso">{estado.sucesso}</Alerta>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {[
          { name: "nome", label: "Nome completo", valor: afiliado.nome },
          { name: "whatsapp", label: "WhatsApp", valor: afiliado.whatsapp },
          { name: "profissao", label: "O que você faz", valor: afiliado.profissao },
          { name: "documento", label: "CPF ou CNPJ", valor: afiliado.documento },
          { name: "chave_pix", label: "Chave Pix", valor: afiliado.chave_pix },
        ].map((c) => (
          <label key={c.name} className="block">
            <span className="rotulo mb-2 block text-white/45">{c.label}</span>
            <input
              name={c.name}
              defaultValue={c.valor ?? ""}
              className="campo w-full px-4 py-2.5 text-sm"
            />
          </label>
        ))}
      </div>

      <div className="mt-5">
        <BotaoSubmit>Salvar dados</BotaoSubmit>
      </div>
    </form>
  );
}
