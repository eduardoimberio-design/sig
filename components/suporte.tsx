"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import {
  enviarMensagemCliente,
  responderComoSig,
  type EstadoForm,
} from "@/app/actions/suporte";
import { Alerta } from "@/components/ui";

const estadoInicial: EstadoForm = {};

export type Mensagem = {
  id: string;
  autor: "cliente" | "sig";
  autor_nome: string | null;
  conteudo: string;
  created_at: string;
};

function quando(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function Conversa({
  mensagens,
  ladoDoSig = false,
}: {
  mensagens: Mensagem[];
  ladoDoSig?: boolean;
}) {
  if (mensagens.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-white/35">
        Nenhuma mensagem ainda.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {mensagens.map((m) => {
        // "Meu lado" muda conforme quem está olhando a tela.
        const meu = ladoDoSig ? m.autor === "sig" : m.autor === "cliente";

        return (
          <div key={m.id} className={meu ? "pl-10" : "pr-10"}>
            <div
              className={`border p-4 ${
                meu
                  ? "border-cyan/30 bg-cyan/5"
                  : "border-base-border bg-base-raised"
              }`}
            >
              <p className="whitespace-pre-line text-sm leading-relaxed text-white/75">
                {m.conteudo}
              </p>
            </div>
            <p className="mt-1.5 text-xs text-white/30">
              {m.autor === "sig" ? (m.autor_nome ?? "SIG") : "Você"} ·{" "}
              {quando(m.created_at)}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function BotaoEnviar() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rotulo border border-cyan bg-cyan/10 px-5 py-2.5 text-cyan
                 transition-colors hover:bg-cyan hover:text-base-bg disabled:opacity-40"
    >
      {pending ? "Enviando…" : "Enviar"}
    </button>
  );
}

export function FormMensagemCliente() {
  const [estado, acao] = useFormState(enviarMensagemCliente, estadoInicial);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (estado.sucesso) ref.current?.reset();
  }, [estado.sucesso]);

  return (
    <form ref={ref} action={acao} className="painel p-6">
      {estado.erro && (
        <div className="mb-4">
          <Alerta tipo="erro">{estado.erro}</Alerta>
        </div>
      )}

      <label className="block">
        <span className="rotulo mb-2 block text-cyan">Escrever mensagem</span>
        <textarea
          name="conteudo"
          rows={4}
          maxLength={4000}
          placeholder="Conte o que está acontecendo. Se for sobre uma tela específica, diga qual."
          className="campo w-full px-4 py-3 text-sm placeholder-white/25"
        />
      </label>

      <div className="mt-4">
        <BotaoEnviar />
      </div>
    </form>
  );
}

export function FormRespostaSig({ empresaId }: { empresaId: string }) {
  const [estado, acao] = useFormState(responderComoSig, estadoInicial);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (estado.sucesso) ref.current?.reset();
  }, [estado.sucesso]);

  return (
    <form ref={ref} action={acao} className="mt-6">
      <input type="hidden" name="empresa_id" value={empresaId} />

      {estado.erro && (
        <div className="mb-4">
          <Alerta tipo="erro">{estado.erro}</Alerta>
        </div>
      )}

      <textarea
        name="conteudo"
        rows={4}
        maxLength={4000}
        placeholder="Responder…"
        className="campo w-full px-4 py-3 text-sm placeholder-white/25"
      />
      <div className="mt-3">
        <BotaoEnviar />
      </div>
    </form>
  );
}
