import { XMLParser } from "fast-xml-parser";

export interface ItemExtraido {
  descricao: string;
  quantidade: number;
  unidade: string | null;
  valorUnitario: number;
  valorTotal: number;
}

export interface NotaExtraida {
  fornecedorNome: string | null;
  fornecedorCnpj: string | null;
  numeroNota: string | null;
  dataEmissao: string | null; // YYYY-MM-DD
  valorTotal: number | null;
  itens: ItemExtraido[];
}

/**
 * Lê o XML padrão de NF-e (modelo 55) direto da estrutura oficial
 * da SEFAZ. Toda nota fiscal eletrônica no Brasil tem esse XML —
 * é a fonte mais confiável possível: 100% de precisão, custo zero,
 * sem depender de IA. Deve ser sempre a primeira tentativa antes
 * de recorrer à leitura por IA de um PDF ou foto.
 */
export function lerXmlNfe(xmlTexto: string): NotaExtraida {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
  });

  const doc = parser.parse(xmlTexto);

  // O XML pode vir como <nfeProc><NFe>...</NFe></nfeProc> (com o
  // protocolo de autorização anexado) ou como <NFe> isolado.
  const nfe = doc?.nfeProc?.NFe ?? doc?.NFe;
  const infNFe = nfe?.infNFe;

  if (!infNFe) {
    throw new Error(
      "Este arquivo não parece ser um XML de NF-e válido. Confira se é o arquivo correto."
    );
  }

  const emit = infNFe.emit ?? {};
  const ide = infNFe.ide ?? {};
  const total = infNFe.total?.ICMSTot ?? {};

  // <det> vem como objeto único quando a nota tem 1 item, ou como
  // array quando tem mais de 1 — o parser não normaliza isso sozinho.
  const detRaw = infNFe.det;
  const detalhes = Array.isArray(detRaw) ? detRaw : detRaw ? [detRaw] : [];

  const itens: ItemExtraido[] = detalhes.map((det: any) => {
    const prod = det.prod ?? {};
    return {
      descricao: String(prod.xProd ?? "Item sem descrição").trim(),
      quantidade: Number(prod.qCom ?? 0),
      unidade: prod.uCom ? String(prod.uCom).trim() : null,
      valorUnitario: Number(prod.vUnCom ?? 0),
      valorTotal: Number(prod.vProd ?? 0),
    };
  });

  const dataEmissaoRaw: string | undefined = ide.dhEmi ?? ide.dEmi;
  const dataEmissao = dataEmissaoRaw
    ? dataEmissaoRaw.slice(0, 10) // "2026-08-05T14:30:00-03:00" -> "2026-08-05"
    : null;

  return {
    fornecedorNome: emit.xNome ? String(emit.xNome).trim() : null,
    fornecedorCnpj: emit.CNPJ ? String(emit.CNPJ).trim() : null,
    numeroNota: ide.nNF ? String(ide.nNF).trim() : null,
    dataEmissao,
    valorTotal: total.vNF ? Number(total.vNF) : null,
    itens,
  };
}
