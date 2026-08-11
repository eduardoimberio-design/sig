import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <div className="painel px-10 py-14 sm:px-16">
        <p className="rotulo text-cyan">Food Service Intelligence</p>

        <h1 className="titulo mt-6 text-6xl font-bold tracking-tight sm:text-7xl">
          SIG
        </h1>

        <div className="regua mx-auto my-6 w-32" />

        <p className="mx-auto max-w-sm text-sm leading-relaxed text-white/55">
          Sistema Inteligente de Gestão. Agentes que cuidam do atendimento, das
          finanças e do estoque do seu negócio.
        </p>

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
