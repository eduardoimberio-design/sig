"use client";

import { useRef, useState } from "react";
import { useFormState } from "react-dom";
import {
  enviarAnexo,
  confirmarAnexo,
  excluirAnexo,
  type EstadoForm,
} from "@/app/actions/anexos";
import { Alerta, BotaoSubmit } from "@/components/ui";

const estadoInicial: EstadoForm = {};

export type Anexo = {
  id: string;
  nome_arquivo: string;
  tipo_arquivo: string;
  descricao: string | null;
  resumo_ia: string | null;
  status: "aguardando" | "confirmado" | "descartado";
  created_at: string;
};

const DICA_POR_MODULO: Record<string, string> = {
  financeiro: "XML de nota fiscal, extrato, boleto, recibo, print de maquininha.",
  estoque: "XML de nota fiscal, tabela de fornecedor, foto da câmara.",
  marketing: "Print do painel do Instagram, do delivery, foto do cardápio.",
  equipe: "Escala, atestado, print de combinação de troca de turno.",
  conselheiro: "Print de conversa, reclamação de cliente, relatório do problema.",
};

function dataCurta(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
}

export function CardAnexos({
  modulo,
  anexos,
}: {
  modulo: string;
  anexos: Anexo[];
}) {
  const [estado, acao] = useFormState(enviarAnexo, estadoInicial);
  const [nomeArquivo, setNomeArquivo] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const aguardando = anexos.filter((a) => a.status === "aguardando");
  const confirmados = anexos.filter((a) => a.status === "confirmado");

  return (
    <section className="painel p-6">
      <div className="mb-1 flex items-baseline justify-between gap-4">
        <p className="rotulo text-cyan">Subir documento</p>
        {confirmados.length > 0 && (
          <span className="text-xs text-white/35">
            {confirmados.length} em uso pelo agente
          </span>
        )}
      </div>
      <p className="mb-5 text-sm text-white/45">
        Envie print, foto ou PDF para o agente entender melhor sua situação.{" "}
        {DICA_POR_MODULO[modulo] ?? ""}
      </p>

      <form
        ref={formRef}
        action={async (formData) => {
          setEnviando(true);
          await acao(formData);
          setEnviando(false);
          setNomeArquivo(null);
          formRef.current?.reset();
        }}
      >
        <input type="hidden" name="modulo" value={modulo} />

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

        <label
          htmlFor={`arquivo-${modulo}`}
          className="flex cursor-pointer flex-col items-center justify-center border border-dashed
                     border-base-border px-6 py-8 text-center transition-colors hover:border-cyan"
        >
          <span className="rotulo text-cyan">
            {nomeArquivo ?? "Clique para selecionar um arquivo"}
          </span>
          <span className="mt-2 text-xs text-white/35">
            XML de nota fiscal, PDF, JPG, PNG ou WEBP — até 15MB
          </span>
          <input
            id={`arquivo-${modulo}`}
            name="arquivo"
            type="file"
            accept=".xml,.pdf,.jpg,.jpeg,.png,.webp"
            className="hidden"
            onChange={(e) =>
              setNomeArquivo(e.target.files?.[0]?.name ?? null)
            }
          />
        </label>

        <label className="mt-4 block">
          <span className="rotulo mb-2 block text-white/45">
            O que é este arquivo (opcional)
          </span>
          <input
            name="descricao"
            type="text"
            maxLength={300}
            placeholder="Ex.: alcance do Instagram nos últimos 30 dias"
            className="campo w-full px-4 py-2.5 placeholder-white/25"
          />
        </label>

        <div className="mt-4">
          <BotaoSubmit>{enviando ? "Lendo o arquivo…" : "Enviar"}</BotaoSubmit>
        </div>
      </form>

      {aguardando.length > 0 && (
        <div className="mt-8 border-t border-base-border pt-6">
          <p className="rotulo mb-1 text-alerta">Confira antes de usar</p>
          <p className="mb-4 text-sm text-white/45">
            A leitura automática pode errar um número. Corrija o texto se
            precisar — o agente vai usar exatamente o que você confirmar.
          </p>
          <div className="space-y-4">
            {aguardando.map((anexo) => (
              <ItemAguardando key={anexo.id} anexo={anexo} modulo={modulo} />
            ))}
          </div>
        </div>
      )}

      {confirmados.length > 0 && (
        <div className="mt-8 border-t border-base-border pt-6">
          <p className="rotulo mb-4 text-white/45">Em uso pelo agente</p>
          <div className="space-y-3">
            {confirmados.map((anexo) => (
              <ItemConfirmado key={anexo.id} anexo={anexo} modulo={modulo} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function ItemAguardando({ anexo, modulo }: { anexo: Anexo; modulo: string }) {
  const [estado, acao] = useFormState(confirmarAnexo, estadoInicial);

  return (
    <div className="border border-base-border p-4">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <span className="text-sm text-white/70">{anexo.nome_arquivo}</span>
        <div className="flex items-baseline gap-3">
          <span className="text-xs text-white/30">
            {dataCurta(anexo.created_at)}
          </span>
          <FormExcluir id={anexo.id} modulo={modulo} rotulo="Descartar" />
        </div>
      </div>

      {estado.erro && (
        <div className="mb-3">
          <Alerta tipo="erro">{estado.erro}</Alerta>
        </div>
      )}

      <form action={acao}>
        <input type="hidden" name="id" value={anexo.id} />
        <input type="hidden" name="modulo" value={modulo} />
        <textarea
          name="resumo"
          rows={6}
          defaultValue={anexo.resumo_ia ?? ""}
          placeholder="A leitura automática não funcionou. Descreva aqui o que este arquivo mostra."
          className="campo w-full px-4 py-3 text-sm placeholder-white/25"
        />
        <div className="mt-3">
          <BotaoSubmit>Confirmar</BotaoSubmit>
        </div>
      </form>
    </div>
  );
}

function ItemConfirmado({ anexo, modulo }: { anexo: Anexo; modulo: string }) {
  const [aberto, setAberto] = useState(false);

  return (
    <div className="border border-base-border p-4">
      <div className="flex items-baseline justify-between gap-3">
        <button
          type="button"
          onClick={() => setAberto((v) => !v)}
          className="text-left text-sm text-white/70 hover:text-cyan"
        >
          {anexo.nome_arquivo}
          {anexo.descricao && (
            <span className="text-white/35"> — {anexo.descricao}</span>
          )}
        </button>
        <span className="text-xs text-white/30">
          {dataCurta(anexo.created_at)}
        </span>
      </div>

      {aberto && (
        <div className="mt-3">
          <p className="whitespace-pre-line text-sm text-white/55">
            {anexo.resumo_ia}
          </p>
          <div className="mt-3">
            <FormExcluir id={anexo.id} modulo={modulo} rotulo="Remover" />
          </div>
        </div>
      )}
    </div>
  );
}

function FormExcluir({
  id,
  modulo,
  rotulo,
}: {
  id: string;
  modulo: string;
  rotulo: string;
}) {
  const [, acao] = useFormState(excluirAnexo, estadoInicial);

  return (
    <form action={acao}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="modulo" value={modulo} />
      <button
        type="submit"
        className="text-xs text-white/35 underline hover:text-negativo"
      >
        {rotulo}
      </button>
    </form>
  );
}
