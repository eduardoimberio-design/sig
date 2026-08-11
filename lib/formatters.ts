export function moeda(valor: number | string | null | undefined): string {
  const n = Number(valor ?? 0);
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function percentual(valor: number | string | null | undefined): string {
  const n = Number(valor ?? 0);
  return `${n.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

export function data(iso: string | null | undefined): string {
  if (!iso) return "—";
  // Datas puras (YYYY-MM-DD) são tratadas como locais para não
  // deslocar um dia por causa de fuso horário.
  const [ano, mes, dia] = iso.slice(0, 10).split("-").map(Number);
  return new Date(ano, mes - 1, dia).toLocaleDateString("pt-BR");
}

export function hoje(): string {
  return new Date().toISOString().slice(0, 10);
}

export function primeiroDiaMes(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

export const GRUPOS_DRE: { valor: string; rotulo: string; ajuda: string }[] = [
  { valor: "cmv", rotulo: "Insumos (CMV)", ajuda: "Tudo que vira prato: carnes, hortifruti, secos, bebidas" },
  { valor: "pessoal", rotulo: "Pessoal", ajuda: "Salários, encargos, freelancers, pró-labore" },
  { valor: "despesa_fixa", rotulo: "Despesa fixa", ajuda: "Aluguel, contador, software, seguro, internet" },
  { valor: "despesa_variavel", rotulo: "Despesa variável", ajuda: "Energia, gás, embalagem, taxa de delivery, limpeza" },
  { valor: "impostos", rotulo: "Impostos", ajuda: "Simples Nacional, ISS, taxas municipais" },
  { valor: "despesa_financeira", rotulo: "Financeira", ajuda: "Juros, tarifa bancária, taxa de maquininha" },
  { valor: "investimento", rotulo: "Investimento", ajuda: "Equipamento, reforma, obra — não entra no resultado do mês" },
  { valor: "retirada", rotulo: "Retirada de lucro", ajuda: "Distribuição aos sócios — não é despesa" },
];

export function rotuloGrupo(valor: string): string {
  return GRUPOS_DRE.find((g) => g.valor === valor)?.rotulo ?? valor;
}
