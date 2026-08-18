"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type Atalho = { rotulo: string; url: string };
type Fala = { role: "user" | "assistant"; content: string; atalhos?: Atalho[] };

const CHAVE_APRESENTADO = "sig-joao-apresentado";

const ABERTURA_VISITANTE =
  "Bem-vindo ao SIG. Eu sou o João, o guia daqui. Fico à disposição para qualquer " +
  "dúvida — é só me chamar no canto da tela quando precisar.";

const ABERTURA_CLIENTE =
  "Bem-vindo ao SIG. Eu sou o João, o guia daqui. Se ficar em dúvida sobre onde fica " +
  "alguma coisa ou como fazer, é só me chamar no canto da tela. Fico à disposição.";

const SUGESTOES_VISITANTE = [
  "O que o SIG faz?",
  "Quanto custa?",
  "Serve para o meu negócio?",
];

const SUGESTOES_CLIENTE = [
  "Por onde eu começo?",
  "Onde lanço uma conta a pagar?",
  "Como o Consultor funciona?",
];

export function Joao({ logado }: { logado: boolean }) {
  const pathname = usePathname();
  const [aberto, setAberto] = useState(false);
  const [falas, setFalas] = useState<Fala[]>([]);
  const [texto, setTexto] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [interagiu, setInteragiu] = useState(false);
  const [ouvindo, setOuvindo] = useState(false);
  const [suportaVoz, setSuportaVoz] = useState(false);
  const reconhecimentoRef = useRef<any>(null);
  const fimRef = useRef<HTMLDivElement>(null);

  // Reconhecimento de fala é nativo do navegador — nenhuma chamada de
  // API, nenhum custo. Só existe no Chrome, Edge e derivados, então o
  // botão só aparece onde realmente funciona.
  useEffect(() => {
    const Reconhecimento =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    setSuportaVoz(!!Reconhecimento);
  }, []);

  function alternarVoz() {
    if (ouvindo) {
      reconhecimentoRef.current?.stop();
      return;
    }

    const Reconhecimento =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!Reconhecimento) return;

    const rec = new Reconhecimento();
    rec.lang = "pt-BR";
    rec.continuous = false;
    rec.interimResults = true;

    let finalizado = "";

    rec.onresult = (evento: any) => {
      let parcial = "";
      for (let i = evento.resultIndex; i < evento.results.length; i++) {
        const trecho = evento.results[i][0].transcript;
        if (evento.results[i].isFinal) finalizado += trecho;
        else parcial += trecho;
      }
      // Mostra enquanto fala, para a pessoa ver que está funcionando.
      setTexto((finalizado + parcial).trim().slice(0, 1000));
    };

    rec.onerror = (evento: any) => {
      setOuvindo(false);
      if (evento.error === "not-allowed") {
        setErro(
          "O navegador bloqueou o microfone. Libere o acesso nas permissões do site para usar por voz."
        );
      } else if (evento.error === "no-speech") {
        setErro("Não ouvi nada. Toque no microfone e fale mais perto.");
      } else {
        setErro("Não consegui usar o microfone agora. Pode escrever?");
      }
    };

    rec.onend = () => setOuvindo(false);

    reconhecimentoRef.current = rec;
    setErro(null);
    setInteragiu(true);
    setOuvindo(true);
    rec.start();
  }

  // Espelho da interação em ref: o timer de auto-recolher é criado uma
  // vez só e não enxergaria a atualização do state.
  const interagiuRef = useRef(false);
  useEffect(() => {
    interagiuRef.current = interagiu;
  }, [interagiu]);

  // Se apresenta uma vez, no primeiro contato: dá boas-vindas, avisa
  // que está à disposição e se recolhe sozinho. Depois disso só volta
  // a aparecer quando a pessoa chamar.
  useEffect(() => {
    try {
      if (localStorage.getItem(CHAVE_APRESENTADO)) return;

      const abre = setTimeout(() => {
        // A marca só é gravada quando ele de fato aparece. Gravar antes
        // fazia o efeito duplo do modo de desenvolvimento cancelar a
        // apresentação — ela nunca acontecia.
        localStorage.setItem(CHAVE_APRESENTADO, "1");
        setAberto(true);
      }, 1200);

      const fecha = setTimeout(() => {
        // Se a pessoa começou a conversar, não fecha na cara dela.
        setAberto((estaAberto) => (interagiuRef.current ? estaAberto : false));
      }, 9000);

      return () => {
        clearTimeout(abre);
        clearTimeout(fecha);
      };
    } catch {
      // Navegador com storage bloqueado: sem apresentação automática,
      // o botão continua funcionando normalmente.
    }
  }, []);


  useEffect(() => {
    if (aberto && falas.length === 0) {
      setFalas([
        {
          role: "assistant",
          content: logado ? ABERTURA_CLIENTE : ABERTURA_VISITANTE,
        },
      ]);
    }
  }, [aberto, falas.length, logado]);

  // Microfone nunca fica ligado com o chat fechado.
  useEffect(() => {
    if (!aberto && reconhecimentoRef.current) {
      reconhecimentoRef.current.stop();
    }
  }, [aberto]);

  useEffect(() => {
    return () => reconhecimentoRef.current?.stop();
  }, []);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [falas, carregando]);

  async function enviar(pergunta: string) {
    const limpa = pergunta.trim();
    if (!limpa || carregando) return;

    // Se estava gravando, para: a pergunta já foi enviada.
    reconhecimentoRef.current?.stop();

    setInteragiu(true);
    setErro(null);
    setTexto("");
    const novas: Fala[] = [...falas, { role: "user", content: limpa }];
    setFalas(novas);
    setCarregando(true);

    try {
      const r = await fetch("/api/joao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mensagens: novas.map((f) => ({ role: f.role, content: f.content })),
          telaAtual: pathname,
        }),
      });

      const dados = await r.json();

      if (!r.ok) {
        setErro(
          dados?.detalhe
            ? `${dados.erro} (detalhe técnico: ${dados.detalhe})`
            : (dados?.erro ?? "Não consegui responder agora.")
        );
      } else {
        setFalas([
          ...novas,
          {
            role: "assistant",
            content: dados.resposta,
            atalhos: dados.atalhos ?? [],
          },
        ]);
      }
    } catch {
      setErro("Falha de conexão. Tente de novo.");
    } finally {
      setCarregando(false);
    }
  }

  const sugestoes = logado ? SUGESTOES_CLIENTE : SUGESTOES_VISITANTE;

  return (
    <>
      {!aberto && (
        <button
          onClick={() => {
            setInteragiu(true);
            setAberto(true);
          }}
          aria-label="Falar com o João"
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 border border-cyan/50
                     bg-base-surface px-4 py-3 text-cyan transition-colors hover:bg-base-raised"
        >
          <span className="rotulo">João</span>
          <span className="text-xs text-white/40">precisa de ajuda?</span>
        </button>
      )}

      {aberto && (
        <div
          className="fixed bottom-6 right-6 z-40 flex h-[min(560px,80vh)] w-[min(380px,calc(100vw-3rem))]
                     flex-col border border-base-border bg-base-surface shadow-2xl"
        >
          <header className="flex items-center justify-between border-b border-base-border px-4 py-3">
            <div>
              <p className="rotulo text-cyan">João</p>
              <p className="text-xs text-white/35">Guia do sistema</p>
            </div>
            <button
              onClick={() => setAberto(false)}
              aria-label="Fechar"
              className="px-2 text-white/40 hover:text-white/80"
            >
              ✕
            </button>
          </header>

          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
            {falas.map((fala, i) => (
              <div key={i}>
                <div
                  className={
                    fala.role === "user"
                      ? "ml-8 border border-base-border bg-base-raised px-3 py-2 text-sm text-white/80"
                      : "mr-4 text-sm leading-relaxed text-white/70"
                  }
                >
                  {fala.content}
                </div>

                {fala.atalhos && fala.atalhos.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {fala.atalhos.map((a, j) => (
                      <Link
                        key={j}
                        href={a.url}
                        onClick={() => setAberto(false)}
                        className="rotulo border border-cyan/40 px-3 py-1.5 text-xs text-cyan
                                   transition-colors hover:bg-cyan hover:text-base-bg"
                      >
                        {a.rotulo}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {carregando && (
              <p className="text-sm text-white/30">João está escrevendo…</p>
            )}

            {erro && (
              <p className="border-l-2 border-alerta pl-3 text-sm text-alerta">
                {erro}
              </p>
            )}

            {falas.length === 1 && !carregando && (
              <div className="flex flex-wrap gap-2 pt-2">
                {sugestoes.map((s) => (
                  <button
                    key={s}
                    onClick={() => enviar(s)}
                    className="border border-base-border px-3 py-1.5 text-xs text-white/50
                               transition-colors hover:border-cyan hover:text-cyan"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            <div ref={fimRef} />
          </div>

          <div className="border-t border-base-border p-3">
            <div className="flex gap-2">
              {suportaVoz && (
                <button
                  onClick={alternarVoz}
                  aria-label={ouvindo ? "Parar de gravar" : "Falar"}
                  title={ouvindo ? "Parar de gravar" : "Perguntar por voz"}
                  className={`border px-3 transition-colors ${
                    ouvindo
                      ? "border-negativo bg-negativo/10 text-negativo"
                      : "border-base-border text-white/40 hover:border-cyan hover:text-cyan"
                  }`}
                >
                  {ouvindo ? "■" : "●"}
                </button>
              )}
              <input
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") enviar(texto);
                }}
                placeholder={
                  ouvindo ? "Ouvindo… pode falar" : "Pergunte alguma coisa"
                }
                maxLength={1000}
                className="campo flex-1 px-3 py-2 text-sm placeholder-white/25"
              />
              <button
                onClick={() => enviar(texto)}
                disabled={carregando || !texto.trim()}
                className="rotulo border border-cyan/50 px-3 text-cyan transition-colors
                           hover:bg-cyan hover:text-base-bg disabled:opacity-30"
              >
                Enviar
              </button>
            </div>
            {ouvindo && (
              <p className="mt-2 text-xs text-white/35">
                Fale e depois confira o texto antes de enviar.
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
