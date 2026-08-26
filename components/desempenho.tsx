import Link from "next/link";
import { moeda, percentual } from "@/lib/formatters";

/**
 * Painel de desempenho do negócio.
 *
 * Quatro pontos, escolhidos por serem os que mais derrubam resultado
 * em food service — e por serem os únicos que o sistema consegue
 * medir com dado real, sem estimativa:
 *
 *   CMV        — o custo da comida, onde o dinheiro vaza primeiro
 *   Pessoal    — a segunda maior conta, e a mais difícil de reverter
 *   Margem     — o que sobra de fato no fim
 *   Atrasos    — saúde do caixa hoje, não no fim do mês
 *
 * CMV + Pessoal formam o Prime Cost, que a literatura de food service
 * trata como o número que decide se a operação para em pé.
 */

type Cor = "verde" | "amarelo" | "vermelho" | "neutro";

const ESTILO: Record<Cor, { borda: string; texto: string; ponto: string }> = {
  verde: {
    borda: "border-positivo/40",
    texto: "text-positivo",
    ponto: "bg-positivo",
  },
  amarelo: {
    borda: "border-alerta/40",
    texto: "text-alerta",
    ponto: "bg-alerta",
  },
  vermelho: {
    borda: "border-negativo/40",
    texto: "text-negativo",
    ponto: "bg-negativo",
  },
  neutro: {
    borda: "border-base-border",
    texto: "text-white/50",
    ponto: "bg-white/20",
  },
};

export type Indicador = {
  rotulo: string;
  valor: string;
  cor: Cor;
  meta: string;
  leitura: string;
};

function Cartao({ ind }: { ind: Indicador }) {
  const e = ESTILO[ind.cor];

  return (
    <div className={`painel border ${e.borda} p-5`}>
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 shrink-0 rounded-full ${e.ponto}`} />
        <span className="rotulo text-white/45">{ind.rotulo}</span>
      </div>

      <p className={`cifra mt-3 text-3xl ${e.texto}`}>{ind.valor}</p>

      <p className="mt-1 text-xs text-white/30">{ind.meta}</p>
      <p className="mt-3 text-sm leading-snug text-white/55">{ind.leitura}</p>
    </div>
  );
}

export function PainelDesempenho({
  indicadores,
  leituraGeral,
  temDados,
}: {
  indicadores: Indicador[];
  leituraGeral: string;
  temDados: boolean;
}) {
  return (
    <section>
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <h2 className="titulo text-xl">Desempenho do negócio</h2>
        <span className="rotulo text-xs text-white/30">Mês até hoje</span>
      </div>

      {!temDados ? (
        <div className="painel p-6">
          <p className="text-sm text-white/50">
            Ainda não há faturamento lançado neste mês, então não dá para medir
            desempenho. Lance as vendas e as contas no Agente Financeiro — a
            partir daí estes indicadores passam a funcionar.
          </p>
          <Link
            href="/painel/financeiro"
            className="rotulo mt-4 inline-block border border-cyan/40 px-4 py-2
                       text-xs text-cyan transition-colors hover:bg-cyan hover:text-base-bg"
          >
            Ir para o Financeiro
          </Link>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {indicadores.map((ind) => (
              <Cartao key={ind.rotulo} ind={ind} />
            ))}
          </div>

          <div className="painel mt-4 p-6">
            <p className="rotulo mb-3 text-cyan">Leitura parcial</p>
            <p className="whitespace-pre-line text-sm leading-relaxed text-white/70">
              {leituraGeral}
            </p>
            <Link
              href="/painel/consultor"
              className="rotulo mt-4 inline-block border border-cyan/40 px-4 py-2
                         text-xs text-cyan transition-colors hover:bg-cyan hover:text-base-bg"
            >
              Análise completa no Consultor
            </Link>
          </div>
        </>
      )}
    </section>
  );
}
