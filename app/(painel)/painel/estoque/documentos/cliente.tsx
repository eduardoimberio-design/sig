"use client";

import { useRef, useState } from "react";
import { useFormState } from "react-dom";
import {
  importarDocumento,
  vincularItemDocumento,
  confirmarDocumento,
  descartarDocumento,
  type EstadoForm,
} from "@/app/actions/estoque";
import { Alerta } from "@/components/ui";
import { moeda, data as fmtData } from "@/lib/formatters";

const estadoInicial: EstadoForm = {};

export function FormUpload() {
  const [estado, acao] = useFormState(importarDocumento, estadoInicial);
  const [nomeArquivo, setNomeArquivo] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        setEnviando(true);
        await acao(formData);
        setEnviando(false);
        setNomeArquivo(null);
        formRef.current?.reset();
      }}
      className="painel p-6"
    >
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
        htmlFor="arquivo"
        className="flex cursor-pointer flex-col items-center justify-center border border-dashed
                   border-base-border px-6 py-10 text-center transition-colors hover:border-cyan"
      >
        <span className="rotulo text-cyan">
          {nomeArquivo ?? "Clique para selecionar um arquivo"}
        </span>
        <span className="mt-2 text-xs text-white/35">
          XML da NF-e (preferencial), PDF, JPG, PNG ou WEBP — até 15MB
        </span>
        <input
          id="arquivo"
          name="arquivo"
          type="file"
          required
          accept=".xml,.pdf,.jpg,.jpeg,.png,.webp"
          className="hidden"
          onChange={(e) => setNomeArquivo(e.target.files?.[0]?.name ?? null)}
        />
      </label>

      {nomeArquivo && (
        <div className="mt-4 max-w-xs">
          <button
            type="submit"
            disabled={enviando}
            className="rotulo w-full border border-cyan bg-cyan/10 px-6 py-3 text-cyan
                       transition-colors hover:bg-cyan hover:text-base-bg disabled:opacity-40"
          >
            {enviando ? "Lendo documento..." : "Enviar e ler"}
          </button>
        </div>
      )}
    </form>
  );
}

interface ItemDoc {
  id: string;
  descricao_original: string;
  quantidade: number;
  unidade_original: string | null;
  valor_unitario: number;
  valor_total: number;
  insumo_id: string | null;
  incluir: boolean;
}

interface Documento {
  id: string;
  tipo: string;
  nome_arquivo: string;
  status: string;
  fornecedor_nome: string | null;
  numero_nota: string | null;
  data_emissao: string | null;
  valor_total: number | null;
  erro_mensagem: string | null;
}

const ROTULO_TIPO: Record<string, string> = {
  xml_nfe: "XML · leitura exata",
  pdf: "PDF · lido por IA",
  imagem: "Foto · lida por IA",
  planilha: "Planilha",
};

export function DocumentoRevisao({
  documento,
  itens,
  insumos,
}: {
  documento: Documento;
  itens: ItemDoc[];
  insumos: { id: string; nome: string; unidade_medida: string }[];
}) {
  if (documento.status === "erro") {
    return (
      <div className="painel p-6">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm text-white/70">{documento.nome_arquivo}</span>
          <span className="rotulo text-negativo">Falha na leitura</span>
        </div>
        <Alerta tipo="erro">
          {documento.erro_mensagem ?? "Não foi possível ler este documento."}
        </Alerta>
        <form action={descartarDocumento} className="mt-3">
          <input type="hidden" name="documento_id" value={documento.id} />
          <button className="rotulo text-white/40 hover:text-white/70">
            Descartar
          </button>
        </form>
      </div>
    );
  }

  const semVinculo = itens.filter((i) => i.incluir && !i.insumo_id).length;

  return (
    <div className="painel p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-white">{documento.nome_arquivo}</p>
          <p className="mt-1 text-xs text-white/40">
            {documento.fornecedor_nome ?? "Fornecedor não identificado"}
            {documento.numero_nota && ` · Nota ${documento.numero_nota}`}
            {documento.data_emissao && ` · ${fmtData(documento.data_emissao)}`}
          </p>
        </div>
        <div className="text-right">
          <span className="rotulo text-cyan">{ROTULO_TIPO[documento.tipo]}</span>
          {documento.valor_total && (
            <p className="cifra mt-1 text-ambar">{moeda(documento.valor_total)}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {itens.map((item) => (
          <LinhaItem key={item.id} item={item} insumos={insumos} />
        ))}
      </div>

      <div className="regua my-5" />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-white/40">
          {semVinculo > 0
            ? `${semVinculo} ${semVinculo === 1 ? "item sem" : "itens sem"} insumo vinculado — eles não serão lançados no estoque.`
            : "Todos os itens têm um insumo vinculado."}
        </p>
        <div className="flex gap-3">
          <form action={descartarDocumento}>
            <input type="hidden" name="documento_id" value={documento.id} />
            <button className="rotulo px-4 py-2 text-white/40 hover:text-white/70">
              Descartar
            </button>
          </form>
          <form action={confirmarDocumento}>
            <input type="hidden" name="documento_id" value={documento.id} />
            <button className="rotulo border border-positivo/50 bg-positivo/10 px-5 py-2 text-positivo transition-colors hover:bg-positivo hover:text-base-bg">
              Confirmar e lançar
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function LinhaItem({
  item,
  insumos,
}: {
  item: ItemDoc;
  insumos: { id: string; nome: string; unidade_medida: string }[];
}) {
  const [insumoId, setInsumoId] = useState(item.insumo_id ?? "");
  const [ensinar, setEnsinar] = useState(true);
  const [salvo, setSalvo] = useState(!!item.insumo_id);

  return (
    <form
      action={async (formData) => {
        await vincularItemDocumento(formData);
        setSalvo(true);
      }}
      className="flex flex-wrap items-center gap-3 border-b border-base-border py-2.5 text-sm last:border-0"
    >
      <input type="hidden" name="item_id" value={item.id} />
      <input
        type="hidden"
        name="descricao_original"
        value={item.descricao_original}
      />

      <span className="min-w-0 flex-1 truncate text-white/70" title={item.descricao_original}>
        {item.descricao_original}
      </span>
      <span className="cifra shrink-0 text-white/40">
        {item.quantidade} {item.unidade_original ?? ""}
      </span>
      <span className="cifra shrink-0 text-white/50">{moeda(item.valor_total)}</span>

      <select
        name="insumo_id"
        value={insumoId}
        onChange={(e) => {
          setInsumoId(e.target.value);
          setSalvo(false);
        }}
        className="campo shrink-0 px-3 py-1.5 text-xs"
      >
        <option value="">Sem vínculo</option>
        {insumos.map((i) => (
          <option key={i.id} value={i.id}>
            {i.nome}
          </option>
        ))}
      </select>

      <label className="flex shrink-0 items-center gap-1.5 text-[11px] text-white/35">
        <input
          type="checkbox"
          name="ensinar"
          checked={ensinar}
          onChange={(e) => setEnsinar(e.target.checked)}
          className="h-3.5 w-3.5 accent-[#4EC5DC]"
        />
        lembrar
      </label>

      <button
        type="submit"
        disabled={salvo || !insumoId}
        className={`rotulo shrink-0 px-3 py-1.5 transition-colors ${
          salvo
            ? "text-positivo/60"
            : "border border-cyan/50 text-cyan hover:bg-cyan hover:text-base-bg"
        }`}
      >
        {salvo ? "Vinculado" : "Vincular"}
      </button>
    </form>
  );
}
