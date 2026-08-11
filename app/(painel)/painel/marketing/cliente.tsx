"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import {
  gerarConteudo,
  atualizarStatusConteudo,
  salvarConfigMarketing,
  type EstadoForm,
} from "@/app/actions/marketing";
import { Campo, BotaoSubmit, Alerta } from "@/components/ui";

const estadoInicial: EstadoForm = {};

const TIPOS = [
  { valor: "post", rotulo: "Post" },
  { valor: "carrossel", rotulo: "Carrossel" },
  { valor: "story", rotulo: "Story" },
  { valor: "campanha", rotulo: "Campanha" },
];

const TEMAS_SUGERIDOS = [
  "Prato parado que merece destaque",
  "Data comemorativa próxima",
  "Bastidores da cozinha",
  "Novo item no cardápio",
  "Promoção de meio de semana",
];

export function FormGerarConteudo({ habilitado }: { habilitado: boolean }) {
  const [estado, acao] = useFormState(gerarConteudo, estadoInicial);
  const [gerando, setGerando] = useState(false);
  const [tipo, setTipo] = useState("post");

  return (
    <form
      action={async (fd) => {
        setGerando(true);
        await acao(fd);
        setGerando(false);
      }}
      className="painel space-y-4 p-6"
    >
      {estado.erro && <Alerta tipo="erro">{estado.erro}</Alerta>}
      {estado.sucesso && <Alerta tipo="sucesso">{estado.sucesso}</Alerta>}

      <div className="flex flex-wrap gap-2">
        {TIPOS.map((t) => (
          <button
            key={t.valor}
            type="button"
            onClick={() => setTipo(t.valor)}
            className={`rotulo border px-4 py-2 transition-colors ${
              tipo === t.valor
                ? "border-cyan bg-cyan/10 text-cyan"
                : "border-base-border text-white/50 hover:text-white/80"
            }`}
          >
            {t.rotulo}
          </button>
        ))}
      </div>
      <input type="hidden" name="tipo" value={tipo} />

      <Campo
        label="Tema ou ocasião"
        name="tema"
        placeholder="Ex.: promoção de terça-feira, aniversário da casa..."
      />

      <div className="flex flex-wrap gap-2">
        {TEMAS_SUGERIDOS.map((t) => (
          <span
            key={t}
            className="rounded-sm border border-base-border px-2 py-1 text-[11px] text-white/35"
          >
            {t}
          </span>
        ))}
      </div>

      <div className="max-w-xs">
        <button
          disabled={!habilitado || gerando}
          className="rotulo w-full border border-cyan bg-cyan/10 px-6 py-3 text-cyan
                     transition-colors hover:bg-cyan hover:text-base-bg disabled:opacity-40"
        >
          {gerando ? "Gerando..." : "Gerar conteúdo"}
        </button>
      </div>
    </form>
  );
}

const ROTULO_STATUS: Record<string, string> = {
  rascunho: "Rascunho",
  aprovado: "Aprovado",
  publicado: "Publicado",
  descartado: "Descartado",
};

const COR_STATUS: Record<string, string> = {
  rascunho: "text-white/40",
  aprovado: "text-cyan",
  publicado: "text-positivo",
  descartado: "text-white/25",
};

export function ListaConteudo({ conteudos }: { conteudos: any[] }) {
  const [copiadoId, setCopiadoId] = useState<string | null>(null);

  function copiar(id: string, texto: string) {
    navigator.clipboard.writeText(texto);
    setCopiadoId(id);
    setTimeout(() => setCopiadoId(null), 2000);
  }

  const ativos = conteudos.filter((c) => c.status !== "descartado");

  if (ativos.length === 0) {
    return (
      <p className="painel p-6 text-sm text-white/45">
        Nenhum conteúdo gerado ainda.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {ativos.map((c) => (
        <div key={c.id} className="painel p-6">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
            <div>
              <span className="rotulo text-cyan">{c.tipo}</span>
              <p className="titulo mt-1 text-lg">{c.titulo}</p>
            </div>
            <span className={`rotulo ${COR_STATUS[c.status]}`}>
              {ROTULO_STATUS[c.status]}
            </span>
          </div>

          {c.slides ? (
            <div className="mb-4 grid gap-2 sm:grid-cols-2">
              {c.slides.map((s: any, i: number) => (
                <div key={i} className="border border-base-border p-3">
                  <p className="rotulo mb-1 text-white/35">Slide {i + 1}</p>
                  <p className="text-sm text-white">{s.titulo}</p>
                  <p className="mt-1 text-xs text-white/60">{s.texto}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mb-4 whitespace-pre-wrap text-sm text-white/75">
              {c.legenda}
            </p>
          )}

          {c.hashtags?.length > 0 && (
            <p className="mb-4 text-xs text-cyan/70">
              {c.hashtags.join(" ")}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() =>
                copiar(
                  c.id,
                  c.slides
                    ? c.slides.map((s: any) => `${s.titulo}\n${s.texto}`).join("\n\n")
                    : `${c.legenda}\n\n${(c.hashtags ?? []).join(" ")}`
                )
              }
              className="rotulo border border-base-border px-3 py-1.5 text-white/50 hover:text-white/80"
            >
              {copiadoId === c.id ? "Copiado!" : "Copiar texto"}
            </button>

            {c.status === "rascunho" && (
              <form action={atualizarStatusConteudo}>
                <input type="hidden" name="id" value={c.id} />
                <input type="hidden" name="status" value="aprovado" />
                <button className="rotulo border border-cyan/50 px-3 py-1.5 text-cyan hover:bg-cyan hover:text-base-bg">
                  Aprovar
                </button>
              </form>
            )}
            {c.status === "aprovado" && (
              <form action={atualizarStatusConteudo}>
                <input type="hidden" name="id" value={c.id} />
                <input type="hidden" name="status" value="publicado" />
                <button className="rotulo border border-positivo/50 px-3 py-1.5 text-positivo hover:bg-positivo hover:text-base-bg">
                  Marcar como publicado
                </button>
              </form>
            )}
            <form action={atualizarStatusConteudo}>
              <input type="hidden" name="id" value={c.id} />
              <input type="hidden" name="status" value="descartado" />
              <button className="rotulo px-3 py-1.5 text-white/30 hover:text-white/55">
                Descartar
              </button>
            </form>
          </div>
        </div>
      ))}
    </div>
  );
}

export function PainelConfigMarketing({ config }: { config: any }) {
  const [estado, acao] = useFormState(salvarConfigMarketing, estadoInicial);

  return (
    <div className="max-w-2xl">
      <a
        href="?"
        className="rotulo mb-6 inline-block text-white/40 hover:text-white/70"
      >
        ← Voltar
      </a>

      <form action={acao} className="painel space-y-5 p-6">
        {estado.erro && <Alerta tipo="erro">{estado.erro}</Alerta>}
        {estado.sucesso && <Alerta tipo="sucesso">{estado.sucesso}</Alerta>}

        <Campo
          label="Tom de voz"
          name="tom_voz"
          defaultValue={config?.tom_voz ?? "caloroso e direto"}
          placeholder="Ex.: descontraído, familiar, sofisticado..."
        />

        <label className="block">
          <span className="rotulo mb-2 block text-white/45">
            Público-alvo
          </span>
          <input
            name="publico_alvo"
            defaultValue={config?.publico_alvo ?? ""}
            placeholder="Ex.: famílias do bairro, jovens profissionais..."
            className="campo w-full px-4 py-2.5 text-sm"
          />
        </label>

        <label className="block">
          <span className="rotulo mb-2 block text-white/45">
            Diferenciais a destacar
          </span>
          <textarea
            name="diferenciais"
            defaultValue={config?.diferenciais ?? ""}
            rows={3}
            placeholder="Ex.: produção própria, ingredientes selecionados, receita de família..."
            className="campo w-full px-4 py-2.5 text-sm"
          />
        </label>

        <div className="max-w-xs">
          <BotaoSubmit>Salvar preferências</BotaoSubmit>
        </div>
      </form>
    </div>
  );
}
