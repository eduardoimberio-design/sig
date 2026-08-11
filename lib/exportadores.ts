import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { DadosRelatorio } from "@/app/actions/metricas";

function dataBR(iso: string) {
  if (!iso) return "";
  const [a, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
}

function nomeArquivo(dados: DadosRelatorio, extensao: string) {
  const empresa = dados.empresaNome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .toLowerCase();
  return `sig-${empresa}-${dados.periodo.inicio}-a-${dados.periodo.fim}.${extensao}`;
}

const ROTULO_GRUPO: Record<string, string> = {
  cmv: "Insumos (CMV)",
  pessoal: "Pessoal",
  despesa_fixa: "Despesa fixa",
  despesa_variavel: "Despesa variável",
  impostos: "Impostos",
  despesa_financeira: "Financeira",
  investimento: "Investimento",
  retirada: "Retirada de lucro",
};

const ROTULO_STATUS: Record<string, string> = {
  pendente: "Pendente",
  pago: "Pago",
  atrasado: "Atrasado",
  cancelado: "Cancelado",
};

// ---------------------------------------------------------
// EXCEL
// Uma aba por tema, com números como número (não texto) para o
// cliente conseguir somar e filtrar no próprio Excel.
// ---------------------------------------------------------
export function gerarExcel(dados: DadosRelatorio) {
  const wb = XLSX.utils.book_new();
  const d = dados.dre;

  const resumo = [
    ["Relatório SIG", ""],
    ["Empresa", dados.empresaNome],
    ["Período", `${dataBR(dados.periodo.inicio)} a ${dataBR(dados.periodo.fim)}`],
    ["Gerado em", new Date().toLocaleString("pt-BR")],
    ["", ""],
    ["DEMONSTRATIVO DE RESULTADO", ""],
    ["Receita bruta", Number(d?.receita_bruta ?? 0)],
    ["(−) Impostos", -Number(d?.impostos ?? 0)],
    ["Receita líquida", Number(d?.receita_liquida ?? 0)],
    ["(−) Insumos (CMV)", -Number(d?.cmv ?? 0)],
    ["Lucro bruto", Number(d?.lucro_bruto ?? 0)],
    ["(−) Pessoal", -Number(d?.pessoal ?? 0)],
    ["(−) Despesas fixas", -Number(d?.despesa_fixa ?? 0)],
    ["(−) Despesas variáveis", -Number(d?.despesa_variavel ?? 0)],
    ["Resultado operacional", Number(d?.resultado_operacional ?? 0)],
    ["(−) Despesas financeiras", -Number(d?.despesa_financeira ?? 0)],
    ["Lucro líquido", Number(d?.lucro_liquido ?? 0)],
    ["", ""],
    ["INDICADORES", ""],
    ["CMV (%)", Number(d?.cmv_percentual ?? 0)],
    ["Margem líquida (%)", Number(d?.margem_liquida ?? 0)],
    ["Ticket médio", Number(d?.ticket_medio ?? 0)],
    ["Atendimentos", Number(d?.num_atendimentos ?? 0)],
  ];
  const wsResumo = XLSX.utils.aoa_to_sheet(resumo);
  wsResumo["!cols"] = [{ wch: 28 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, wsResumo, "Resumo");

  if (dados.vendasDiarias.length > 0) {
    const vendas = [
      ["Data", "Faturamento", "Atendimentos", "Ticket médio", "Canal"],
      ...dados.vendasDiarias.map((v) => [
        dataBR(v.data),
        Number(v.faturamento),
        Number(v.num_atendimentos),
        Number(v.num_atendimentos) > 0
          ? Number(v.faturamento) / Number(v.num_atendimentos)
          : 0,
        v.canal ?? "",
      ]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(vendas);
    ws["!cols"] = [{ wch: 12 }, { wch: 14 }, { wch: 13 }, { wch: 13 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, ws, "Vendas");
  }

  if (dados.contasPagar.length > 0) {
    const pagar = [
      ["Descrição", "Fornecedor", "Classificação", "Valor", "Vencimento", "Status"],
      ...dados.contasPagar.map((c) => [
        c.descricao,
        c.fornecedor ?? "",
        ROTULO_GRUPO[c.grupo_dre] ?? c.grupo_dre,
        Number(c.valor),
        dataBR(c.vencimento),
        ROTULO_STATUS[c.status] ?? c.status,
      ]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(pagar);
    ws["!cols"] = [{ wch: 30 }, { wch: 22 }, { wch: 18 }, { wch: 13 }, { wch: 12 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, ws, "Contas a pagar");
  }

  if (dados.contasReceber.length > 0) {
    const receber = [
      ["Descrição", "Cliente", "Valor", "Vencimento", "Status"],
      ...dados.contasReceber.map((c) => [
        c.descricao,
        c.cliente ?? "",
        Number(c.valor),
        dataBR(c.vencimento),
        ROTULO_STATUS[c.status] ?? c.status,
      ]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(receber);
    ws["!cols"] = [{ wch: 30 }, { wch: 22 }, { wch: 13 }, { wch: 12 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, ws, "Contas a receber");
  }

  if (dados.cmvProdutos.length > 0) {
    const cmv = [
      ["Produto", "Preço de venda", "Custo da ficha", "CMV (%)", "Margem (%)"],
      ...dados.cmvProdutos.map((p: any) => [
        p.produto_nome,
        Number(p.preco_venda),
        Number(p.custo_ficha),
        Number(p.cmv_percentual),
        Number(p.margem_percentual),
      ]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(cmv);
    ws["!cols"] = [{ wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 11 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, ws, "CMV por produto");
  }

  XLSX.writeFile(wb, nomeArquivo(dados, "xlsx"));
}

// ---------------------------------------------------------
// PDF
// Documento fechado, para apresentar a sócio, contador ou banco.
// ---------------------------------------------------------
const MARINHO: [number, number, number] = [7, 17, 32];
const LATAO: [number, number, number] = [217, 169, 76];
const CINZA: [number, number, number] = [110, 120, 135];

export function gerarPDF(dados: DadosRelatorio) {
  const doc = new jsPDF();
  const d = dados.dre;
  const larguraPagina = doc.internal.pageSize.getWidth();

  // Cabeçalho
  doc.setFillColor(...MARINHO);
  doc.rect(0, 0, larguraPagina, 32, "F");

  doc.setTextColor(...LATAO);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("SIG", 14, 15);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(dados.empresaNome, 14, 23);

  doc.setFontSize(8);
  doc.setTextColor(180, 190, 205);
  doc.text(
    `${dataBR(dados.periodo.inicio)} a ${dataBR(dados.periodo.fim)}`,
    larguraPagina - 14,
    15,
    { align: "right" }
  );
  doc.text(
    `Gerado em ${new Date().toLocaleDateString("pt-BR")}`,
    larguraPagina - 14,
    21,
    { align: "right" }
  );

  let y = 44;

  // Indicadores em destaque
  const indicadores = [
    ["Faturamento", `R$ ${Number(d?.receita_bruta ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`],
    ["CMV", `${Number(d?.cmv_percentual ?? 0).toFixed(1)}%`],
    ["Ticket médio", `R$ ${Number(d?.ticket_medio ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`],
    ["Lucro líquido", `R$ ${Number(d?.lucro_liquido ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`],
  ];

  const larguraCard = (larguraPagina - 28 - 9) / 4;
  indicadores.forEach((ind, i) => {
    const x = 14 + i * (larguraCard + 3);
    doc.setDrawColor(220, 224, 230);
    doc.setFillColor(249, 250, 251);
    doc.rect(x, y, larguraCard, 20, "FD");

    doc.setFontSize(7);
    doc.setTextColor(...CINZA);
    doc.text(ind[0].toUpperCase(), x + 3, y + 6);

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 35, 45);
    doc.text(ind[1], x + 3, y + 15);
    doc.setFont("helvetica", "normal");
  });

  y += 32;

  // DRE
  autoTable(doc, {
    startY: y,
    head: [["Demonstrativo de resultado", "Valor"]],
    body: [
      ["Receita bruta", Number(d?.receita_bruta ?? 0)],
      ["(−) Impostos", -Number(d?.impostos ?? 0)],
      ["Receita líquida", Number(d?.receita_liquida ?? 0)],
      ["(−) Insumos (CMV)", -Number(d?.cmv ?? 0)],
      ["Lucro bruto", Number(d?.lucro_bruto ?? 0)],
      ["(−) Pessoal", -Number(d?.pessoal ?? 0)],
      ["(−) Despesas fixas", -Number(d?.despesa_fixa ?? 0)],
      ["(−) Despesas variáveis", -Number(d?.despesa_variavel ?? 0)],
      ["Resultado operacional", Number(d?.resultado_operacional ?? 0)],
      ["(−) Despesas financeiras", -Number(d?.despesa_financeira ?? 0)],
      ["Lucro líquido", Number(d?.lucro_liquido ?? 0)],
    ].map(([rotulo, valor]) => [
      rotulo,
      `R$ ${Number(valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
    ]),
    theme: "grid",
    headStyles: { fillColor: MARINHO, textColor: [255, 255, 255], fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    columnStyles: { 1: { halign: "right" } },
    didParseCell: (data) => {
      // Destaca as linhas de subtotal e o resultado final
      const linhasDestaque = [2, 4, 8, 10];
      if (data.section === "body" && linhasDestaque.includes(data.row.index)) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = [244, 246, 249];
      }
    },
    margin: { left: 14, right: 14 },
  });

  y = (doc as any).lastAutoTable.finalY + 10;

  // CMV por produto
  if (dados.cmvProdutos.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [["Produto", "Preço", "Custo ficha", "CMV", "Margem"]],
      body: dados.cmvProdutos.map((p: any) => [
        p.produto_nome,
        `R$ ${Number(p.preco_venda).toFixed(2)}`,
        `R$ ${Number(p.custo_ficha).toFixed(2)}`,
        `${Number(p.cmv_percentual).toFixed(1)}%`,
        `${Number(p.margem_percentual).toFixed(1)}%`,
      ]),
      theme: "grid",
      headStyles: { fillColor: MARINHO, textColor: [255, 255, 255], fontSize: 9 },
      bodyStyles: { fontSize: 8 },
      columnStyles: {
        1: { halign: "right" },
        2: { halign: "right" },
        3: { halign: "right" },
        4: { halign: "right" },
      },
      margin: { left: 14, right: 14 },
    });
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // Vendas diárias
  if (dados.vendasDiarias.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [["Data", "Faturamento", "Atendimentos", "Ticket médio", "Canal"]],
      body: dados.vendasDiarias.map((v) => [
        dataBR(v.data),
        `R$ ${Number(v.faturamento).toFixed(2)}`,
        String(v.num_atendimentos),
        Number(v.num_atendimentos) > 0
          ? `R$ ${(Number(v.faturamento) / Number(v.num_atendimentos)).toFixed(2)}`
          : "—",
        v.canal ?? "—",
      ]),
      theme: "grid",
      headStyles: { fillColor: MARINHO, textColor: [255, 255, 255], fontSize: 9 },
      bodyStyles: { fontSize: 8 },
      columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" } },
      margin: { left: 14, right: 14 },
    });
  }

  // Rodapé em todas as páginas
  const totalPaginas = doc.getNumberOfPages();
  for (let i = 1; i <= totalPaginas; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(...CINZA);
    doc.text(
      "Gerado pelo SIG — Sistema Inteligente de Gestão",
      14,
      doc.internal.pageSize.getHeight() - 8
    );
    doc.text(
      `${i} / ${totalPaginas}`,
      larguraPagina - 14,
      doc.internal.pageSize.getHeight() - 8,
      { align: "right" }
    );
  }

  doc.save(nomeArquivo(dados, "pdf"));
}
