// app/diagnostico/page.tsx
//
// O formulário de 7 perguntas foi removido: o diagnóstico agora acontece na
// conversa com o João, que abre sozinho nesta tela (ver components/joao.tsx).
//
// Esta página virou o que sustenta a conversa: explica o que a pessoa vai receber,
// dá autoridade e mantém a promessa do anúncio visível enquanto ela responde ao
// João no canto da tela. Sem "use client" — é só conteúdo, sem estado.

export const metadata = {
  title: "Diagnóstico gratuito — SIG",
  description:
    "Descubra em 3 minutos o CMV, o custo de equipe e o Prime Cost do seu negócio de alimentação.",
};

export default function DiagnosticoPage() {
  return (
    <main
      className="min-h-screen text-[#E8EEF3]"
      style={{
        backgroundImage:
          "linear-gradient(rgba(5,11,20,0.72), rgba(5,11,20,0.85)), url('/images/diagnostico-bg.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* A margem à direita abre espaço para a janela do João em telas grandes,
          para que ela não cubra o texto que sustenta a conversa. */}
      <div className="mx-auto max-w-3xl px-6 py-16 lg:pr-[28rem]">
        <header className="mb-12 flex items-center justify-between">
          <div className="titulo text-lg font-bold">
            SIG<span className="text-cyan">.</span>
          </div>
          <div className="rotulo rounded-sm border border-cyan/20 px-3 py-1.5 text-[11px] text-white/45">
            SISTEMA INTELIGENTE DE GESTÃO
          </div>
        </header>

        <span className="rotulo mb-4 block text-[11px] tracking-[0.14em] text-cyan">
          Diagnóstico gratuito · 3 minutos
        </span>

        <h1 className="titulo mb-4 text-3xl font-bold leading-tight sm:text-4xl">
          Existe um número dentro do seu negócio que decide se{" "}
          <span className="text-cyan">sobra lucro</span> no fim do mês. Você já
          calculou ele?
        </h1>

        <p className="mb-8 max-w-lg text-[15px] leading-relaxed text-white/55">
          Não é sobre vender mais. É sobre parar de perder dinheiro sem saber onde.
          O João está aqui do lado e vai te fazer algumas perguntas rápidas — no fim,
          você recebe a leitura completa dos seus números.
        </p>

        <div className="mb-6 rounded-sm border border-cyan/30 bg-cyan/[0.04] px-5 py-4">
          <p className="text-[15px] leading-relaxed text-white/70">
            <span className="text-cyan">→</span> Comece respondendo o João na janela
            ao lado. Leva uns 3 minutos.
          </p>
        </div>

        <p className="mb-16 max-w-lg text-[13px] leading-relaxed text-white/40">
          Os números que você informar são confidenciais. Servem apenas para gerar o
          seu diagnóstico — não são divulgados nem disponibilizados para uso
          comercial.
        </p>

        {/* PROBLEMA */}
        <span className="rotulo mb-4 block text-[11px] tracking-[0.14em] text-ambar">
          O que ninguém te conta
        </span>
        <h2 className="titulo mb-4 max-w-lg text-2xl font-bold leading-snug">
          Fechar o caixa "bem" não significa que está indo bem
        </h2>
        <p className="mb-16 max-w-lg text-[15px] leading-relaxed text-white/55">
          A maioria dos negócios de alimentação não afunda por falta de cliente —
          afunda porque o dono decide o tempo todo (preço, cardápio, escala de equipe)
          sem nenhum número real na mão. E o problema não aparece de uma vez: ele se
          acumula mês a mês, silenciosamente, até virar uma bola de neve que ninguém
          viu crescer.
        </p>

        {/* AUTORIDADE */}
        <span className="rotulo mb-4 block text-[11px] tracking-[0.14em] text-cyan">
          Por trás do diagnóstico
        </span>
        <h2 className="titulo mb-4 max-w-lg text-2xl font-bold leading-snug">
          O mesmo raciocínio da consultoria presencial — só que em 3 minutos
        </h2>
        <blockquote className="titulo mb-4 max-w-lg border-l-2 border-cyan pl-5 text-lg leading-relaxed">
          "Depois de anos como consultor de bares e restaurantes, transformei em
          produto o mesmo raciocínio que uso presencialmente para encontrar a causa
          raiz dos problemas — só que agora ele roda todo dia, não uma vez por mês."
        </blockquote>
        <p className="rotulo mb-4 text-[12px] text-white/45">
          EDUARDO IMBERIO — Consultor de food service, criador do SIG
        </p>
        <p className="mb-16 max-w-lg text-[15px] leading-relaxed text-white/55">
          Métodos de consultoria profissional aplicados todos os dias, não só uma vez
          por mês.
        </p>

        {/* ANTECIPAÇÃO */}
        <div className="rounded-sm border border-ambar/30 bg-ambar/[0.04] p-6">
          <span className="rotulo mb-4 block text-[11px] tracking-[0.14em] text-ambar">
            Em 3 minutos você vai descobrir
          </span>
          <ul className="space-y-3">
            {[
              "Se o seu CMV está dentro, acima ou abaixo do saudável pro seu segmento",
              "Se o custo com a sua equipe está puxando a margem pra baixo",
              "O Prime Cost do seu negócio — o número que a maioria nunca calculou, mas que decide se sobra lucro",
              "A causa mais provável de onde você está perdendo dinheiro, e o que fazer sobre isso essa semana",
            ].map((item) => (
              <li key={item} className="flex gap-3 text-[15px] leading-relaxed">
                <span className="shrink-0 text-ambar">→</span>
                <span className="text-white/70">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <footer className="rotulo mt-14 flex flex-wrap justify-between gap-3 border-t border-cyan/15 pt-6 text-xs text-white/45">
          <span>SIG — Sistema Inteligente de Gestão</span>
          <span>WhatsApp: +55 11 98550-3734</span>
        </footer>
      </div>
    </main>
  );
}
