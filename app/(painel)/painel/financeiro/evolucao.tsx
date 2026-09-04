import { moeda } from "@/lib/formatters";

/**
 * Evolução mês a mês de CMV, mão de obra e Prime Cost.
 *
 * Um mês isolado diz pouco: uma compra grande em 30 de janeiro
 * infla o CMV de janeiro e esvazia o de fevereiro. Tendência é o
 * que revela se o custo está realmente subindo.
 */

type Mes = {
  mes: string;
  receita: number;
  cmv: number;
  pessoal: number;
  cmv_percentual: number;
  pessoal_percentual: number;
  prime_cost_percentual: number;
};

function nomeMes(iso: string) {
  const [ano, mes] = iso.slice(0, 10).split("-");
  const nomes = [
    "jan", "fev", "mar", "abr", "mai", "jun",
    "jul", "ago", "set", "out", "nov", "dez",
  ];
  return `${nomes[Number(mes) - 1]}/${ano.slice(2)}`;
}

function cor(valor: number, bom: number, atencao: number) {
  if (valor === 0) return "text-white/25";
  if (valor <= bom) return "text-positivo";
  if (valor <= atencao) return "text-alerta";
  return "text-negativo";
}

export function EvolucaoCustos({
  serie,
  metaCmv,
}: {
  serie: Mes[];
  metaCmv: number;
}) {
  const comDados = serie.filter((m) => m.receita > 0);

  if (comDados.length === 0) {
    return null;
  }

  const maiorPrime = Math.max(
    ...comDados.map((m) => Number(m.prime_cost_percentual)),
    70
  );

  return (
    <section>
      <h2 className="titulo mb-1 text-xl">Evolução de custos</h2>
      <p className="mb-4 text-sm text-white/45">
        Mercadoria e mão de obra mês a mês. Somados, formam o Prime Cost — o
        número que decide se a operação para em pé.
      </p>

      <div className="painel overflow-x-auto p-6">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-base-border text-left">
              <th className="rotulo pb-3 text-white/40">Mês</th>
              <th className="rotulo pb-3 text-right text-white/40">
                Faturamento
              </th>
              <th className="rotulo pb-3 text-right text-white/40">CMV</th>
              <th className="rotulo pb-3 text-right text-white/40">Pessoal</th>
              <th className="rotulo pb-3 text-right text-white/40">
                Prime Cost
              </th>
            </tr>
          </thead>
          <tbody>
            {serie.map((m) => (
              <tr
                key={m.mes}
                className="border-b border-base-border/50 last:border-0"
              >
                <td className="py-3 text-white/70">{nomeMes(m.mes)}</td>
                <td className="cifra py-3 text-right text-ambar">
                  {m.receita > 0 ? moeda(m.receita) : "—"}
                </td>
                <td
                  className={`cifra py-3 text-right ${cor(
                    Number(m.cmv_percentual),
                    metaCmv,
                    metaCmv + 5
                  )}`}
                >
                  {m.receita > 0 ? `${m.cmv_percentual}%` : "—"}
                  <span className="block text-xs text-white/25">
                    {m.cmv > 0 ? moeda(m.cmv) : ""}
                  </span>
                </td>
                <td
                  className={`cifra py-3 text-right ${cor(
                    Number(m.pessoal_percentual),
                    30,
                    35
                  )}`}
                >
                  {m.receita > 0 ? `${m.pessoal_percentual}%` : "—"}
                  <span className="block text-xs text-white/25">
                    {m.pessoal > 0 ? moeda(m.pessoal) : ""}
                  </span>
                </td>
                <td
                  className={`cifra py-3 text-right ${cor(
                    Number(m.prime_cost_percentual),
                    65,
                    70
                  )}`}
                >
                  {m.receita > 0 ? `${m.prime_cost_percentual}%` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-6 space-y-2">
          {comDados.map((m) => (
            <div key={m.mes} className="flex items-center gap-3">
              <span className="w-14 shrink-0 text-xs text-white/35">
                {nomeMes(m.mes)}
              </span>
              <div className="flex h-2 flex-1 overflow-hidden bg-base-raised">
                <div
                  className="bg-ambar"
                  style={{
                    width: `${(Number(m.cmv_percentual) / maiorPrime) * 100}%`,
                  }}
                  title="Mercadoria"
                />
                <div
                  className="bg-cyan"
                  style={{
                    width: `${(Number(m.pessoal_percentual) / maiorPrime) * 100}%`,
                  }}
                  title="Pessoal"
                />
              </div>
              <span className="w-12 shrink-0 text-right text-xs text-white/40">
                {m.prime_cost_percentual}%
              </span>
            </div>
          ))}

          <div className="flex gap-4 pt-2 text-xs text-white/30">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 bg-ambar" /> Mercadoria
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 bg-cyan" /> Pessoal
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
