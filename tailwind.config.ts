import type { Config } from "tailwindcss";

// -----------------------------------------------------------
// SIG — sistema visual: terminal financeiro retrofuturista
//
// Base marinho (confianca institucional) + acentos de fosforo
// (vocabulario de instrumento tecnico dos anos 80).
//
// REGRA: `positivo` e `negativo` sao SEMANTICOS — significam
// lucro e prejuizo, nunca decoracao. `cyan` = interacao.
// `ambar` = cifras. `alerta` = atencao.
// -----------------------------------------------------------

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        base: {
          bg: "#050B14",      // quase preto azulado - tela apagada
          surface: "#0B1626", // painel
          raised: "#122135",  // painel elevado
          border: "#1E3350",  // linha de instrumento
        },
        cyan: {
          DEFAULT: "#4EC5DC", // fosforo ciano - interacao, marca
          light: "#8EDCEB",
          dark: "#2E93A8",
        },
        ambar: {
          DEFAULT: "#D9A94C", // fosforo ambar - cifras e valores
          light: "#EFC97E",
        },
        positivo: "#3ED598",
        negativo: "#FF6B7A",
        alerta: "#FF9E4D",
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        sans: ["var(--font-sans)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
    },
  },
};
export default config;
