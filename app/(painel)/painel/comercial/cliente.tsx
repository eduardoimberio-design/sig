"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useFormState } from "react-dom";
import {
  salvarConfigComercial,
  abrirConversa,
  assumirConversa,
  devolverParaAgente,
  enviarMensagemManual,
  type EstadoForm,
} from "@/app/actions/comercial";
import { Campo, BotaoSubmit, Alerta } from "@/components/ui";

const estadoInicial: EstadoForm = {};

interface Conversa {
  id: string;
  contato_telefone: string;
  contato_nome: string | null;
  status: string;
  atribuida_humano: boolean;
  nao_lidas: number;
  ultima_mensagem_em: string;
}

interface Mensagem {
  id: string;
  remetente: string;
  conteudo: string;
  created_at: string;
}

function horaCurta(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function PainelConversas({
  conversas,
  conversaAtual,
  mensagens,
  empresaNome,
}: {
  conversas: Conversa[];
  conversaAtual: Conversa | null;
  mensagens: Mensagem[];
  empresaNome: string;
}) {
  if (conversas.length === 0) {
    return (
      <div className="painel p-10 text-center">
        <p className="titulo text-lg text-ambar">Nenhuma conversa ainda</p>
        <p className="mx-auto mt-2 max-w-sm text-sm text-white/50">
          Assim que um cliente mandar mensagem no WhatsApp conectado, a
          conversa aparece aqui automaticamente.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <div className="painel max-h-[70vh] overflow-y-auto">
        {conversas.map((c) => {
          const ativa = c.id === conversaAtual?.id;
          return (
            <Link
              key={c.id}
              href={`?conversa=${c.id}`}
              className={`block border-b border-base-border px-4 py-3 last:border-0 ${
                ativa ? "bg-cyan/10" : "hover:bg-white/[0.03]"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm text-white">
                  {c.contato_nome || c.contato_telefone}
                </span>
                {c.nao_lidas > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-cyan px-1 text-[11px] font-bold text-base-bg">
                    {c.nao_lidas}
                  </span>
                )}
              </div>
              <div className="mt-1 flex items-center justify-between text-xs">
                <span
                  className={
                    c.atribuida_humano ? "text-alerta" : "text-white/35"
                  }
                >
                  {c.atribuida_humano ? "Com atendente" : "Com o agente"}
                </span>
                <span className="text-white/30">
                  {horaCurta(c.ultima_mensagem_em)}
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      {conversaAtual ? (
        <ThreadConversa
          conversa={conversaAtual}
          mensagens={mensagens}
          empresaNome={empresaNome}
        />
      ) : (
        <div className="painel flex items-center justify-center p-10 text-sm text-white/40">
          Selecione uma conversa
        </div>
      )}
    </div>
  );
}

function ThreadConversa({
  conversa,
  mensagens,
  empresaNome,
}: {
  conversa: Conversa;
  mensagens: Mensagem[];
  empresaNome: string;
}) {
  const fimRef = useRef<HTMLDivElement>(null);
  const [estado, acaoEnvio] = useFormState(enviarMensagemManual, estadoInicial);

  useEffect(() => {
    // Marca como lida ao abrir
    const fd = new FormData();
    fd.set("conversa_id", conversa.id);
    abrirConversa(fd);
  }, [conversa.id]);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ block: "end" });
  }, [mensagens.length]);

  return (
    <div className="painel flex max-h-[70vh] flex-col">
      <div className="flex items-center justify-between border-b border-base-border px-5 py-3">
        <div>
          <p className="text-sm text-white">
            {conversa.contato_nome || conversa.contato_telefone}
          </p>
          <p className="text-xs text-white/35">{conversa.contato_telefone}</p>
        </div>

        {conversa.atribuida_humano ? (
          <form action={devolverParaAgente}>
            <input type="hidden" name="conversa_id" value={conversa.id} />
            <button className="rotulo border border-cyan/50 px-3 py-1.5 text-cyan hover:bg-cyan hover:text-base-bg">
              Devolver ao agente
            </button>
          </form>
        ) : (
          <form action={assumirConversa}>
            <input type="hidden" name="conversa_id" value={conversa.id} />
            <button className="rotulo border border-alerta/50 px-3 py-1.5 text-alerta hover:bg-alerta hover:text-base-bg">
              Assumir conversa
            </button>
          </form>
        )}
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-5">
        {mensagens.map((m) => (
          <BolhaMensagem key={m.id} mensagem={m} empresaNome={empresaNome} />
        ))}
        <div ref={fimRef} />
      </div>

      <form
        action={acaoEnvio}
        className="flex items-center gap-3 border-t border-base-border p-4"
      >
        <input type="hidden" name="conversa_id" value={conversa.id} />
        <input type="hidden" name="telefone" value={conversa.contato_telefone} />

        {estado.erro && (
          <div className="absolute -mt-16">
            <Alerta tipo="erro">{estado.erro}</Alerta>
          </div>
        )}

        <input
          name="texto"
          placeholder={
            conversa.atribuida_humano
              ? "Responder como atendente..."
              : "Assuma a conversa para responder manualmente"
          }
          disabled={!conversa.atribuida_humano}
          required
          className="campo flex-1 px-4 py-2.5 text-sm disabled:opacity-40"
        />
        <button
          disabled={!conversa.atribuida_humano}
          className="rotulo border border-cyan bg-cyan/10 px-5 py-2.5 text-cyan
                     transition-colors hover:bg-cyan hover:text-base-bg disabled:opacity-40"
        >
          Enviar
        </button>
      </form>
    </div>
  );
}

function BolhaMensagem({
  mensagem,
  empresaNome,
}: {
  mensagem: Mensagem;
  empresaNome: string;
}) {
  const doCliente = mensagem.remetente === "cliente";
  const rotulo =
    mensagem.remetente === "agente_ia"
      ? "Agente"
      : mensagem.remetente === "humano"
        ? empresaNome
        : null;

  return (
    <div className={`flex ${doCliente ? "justify-start" : "justify-end"}`}>
      <div
        className={`max-w-[75%] px-4 py-2.5 text-sm ${
          doCliente
            ? "bg-base-raised text-white/85"
            : mensagem.remetente === "agente_ia"
              ? "bg-cyan/15 text-white/90"
              : "bg-ambar/15 text-white/90"
        }`}
      >
        {rotulo && (
          <p className="rotulo mb-1 text-[10px] text-white/40">{rotulo}</p>
        )}
        <p className="whitespace-pre-wrap">{mensagem.conteudo}</p>
        <p className="mt-1 text-right text-[10px] text-white/30">
          {horaCurta(mensagem.created_at)}
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------
// CONFIGURAÇÃO
// ---------------------------------------------------------
export function PainelConfig({ config }: { config: any }) {
  const [estado, acao] = useFormState(salvarConfigComercial, estadoInicial);

  return (
    <div className="max-w-2xl">
      <a
        href="?"
        className="rotulo mb-6 inline-block text-white/40 hover:text-white/70"
      >
        ← Voltar às conversas
      </a>

      <form action={acao} className="painel space-y-5 p-6">
        {estado.erro && <Alerta tipo="erro">{estado.erro}</Alerta>}
        {estado.sucesso && <Alerta tipo="sucesso">{estado.sucesso}</Alerta>}

        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            name="ativo"
            defaultChecked={config?.ativo}
            className="h-4 w-4 accent-[#4EC5DC]"
          />
          <span className="text-sm">Agente ativo</span>
        </label>
        <p className="-mt-3 text-xs text-white/35">
          Desligado, as mensagens chegam mas ninguém responde automaticamente
          — use se quiser atender manualmente por um período.
        </p>

        <Campo
          label="Nome do atendente"
          name="nome_atendente"
          defaultValue={config?.nome_atendente ?? "Atendimento"}
        />

        <label className="block">
          <span className="rotulo mb-2 block text-white/45">
            Mensagem de boas-vindas
          </span>
          <textarea
            name="mensagem_boas_vindas"
            defaultValue={config?.mensagem_boas_vindas ?? ""}
            rows={2}
            placeholder="Opcional — enviada automaticamente na primeira mensagem do dia"
            className="campo w-full px-4 py-2.5 text-sm"
          />
        </label>

        <label className="block">
          <span className="rotulo mb-2 block text-white/45">
            Instruções específicas
          </span>
          <textarea
            name="instrucoes_extras"
            defaultValue={config?.instrucoes_extras ?? ""}
            rows={4}
            placeholder="Ex.: hoje temos promoção de rodízio às terças. Não fazemos entrega aos domingos."
            className="campo w-full px-4 py-2.5 text-sm"
          />
          <p className="mt-1.5 text-xs text-white/35">
            O agente sempre conhece seu cardápio automaticamente. Use este
            campo só para regras ou avisos que mudam com frequência.
          </p>
        </label>

        <div className="max-w-xs">
          <BotaoSubmit>Salvar configuração</BotaoSubmit>
        </div>
      </form>
    </div>
  );
}
