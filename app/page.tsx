import Link from "next/link";

const SERVICOS = [
  "Finanças",
  "Marketing",
  "Análise de dados e de desempenho",
  "Fluxos de trabalho",
  "Gestão de equipe",
  "Direcionamento estratégico",
];

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-12 text-center">
      <div className="painel w-full max-w-lg px-8 py-12 sm:px-14">
        <p className="rotulo text-cyan">Food Service Intelligence</p>

        <h1 className="titulo mt-6 text-6xl font-bold tracking-tight sm:text-7xl">
          SIG
        </h1>

        <div className="regua mx-auto my-6 w-32" />

        <p className="mx-auto max-w-sm text-sm leading-relaxed text-white/55">
          Sistema Inteligente de Gestão. Agentes que resolvem os problemas do
          dia a dia do seu negócio.
        </p>

        <ul className="mx-auto mt-8 flex max-w-md flex-wrap justify-center gap-2">
          {SERVICOS.map((servico) => (
            <li
              key={servico}
              className="rotulo border border-base-border px-3 py-1.5 text-white/50"
            >
              {servico}
            </li>
          ))}
        </ul>

        <Link
          href="/login"
          className="rotulo mt-10 inline-block border border-cyan bg-cyan/10 px-10 py-3
                     text-cyan transition-colors hover:bg-cyan hover:text-base-bg"
        >
          Acessar painel
        </Link>
      </div>
    </main>
  );
}
