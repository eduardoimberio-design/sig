"use client";

// app/(auth)/confirmar/page.tsx
//
// Por que esta página existe: o link padrão de e-mail do Supabase
// (via {{ .ConfirmationURL }}) consome o token assim que é ABERTO — nem
// precisa de clique. Scanners de segurança de e-mail (Gmail, Outlook etc.)
// abrem esses links automaticamente pra checar se são maliciosos, e isso
// invalida o link antes da pessoa real clicar.
//
// Esta página resolve isso: o e-mail agora aponta pra cá com um
// `token_hash` que NÃO é consumido automaticamente. Ele só é trocado por
// uma sessão de verdade quando a pessoa clica no botão "Confirmar" —
// uma ação real de usuário, que nenhum scanner automatizado replica.

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Alerta } from "@/components/ui";

type TipoConfirmacao = "recovery" | "signup" | "invite" | "email_change" | "magiclink";

const TITULO_POR_TIPO: Record<TipoConfirmacao, string> = {
  recovery: "Confirmar redefinição de senha",
  signup: "Confirmar seu cadastro",
  invite: "Confirmar convite",
  email_change: "Confirmar novo e-mail",
  magiclink: "Confirmar acesso",
};

const DESTINO_POR_TIPO: Record<TipoConfirmacao, string> = {
  recovery: "/nova-senha",
  signup: "/painel",
  invite: "/nova-senha",
  email_change: "/painel",
  magiclink: "/painel",
};

export default function ConfirmarPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const tokenHash = searchParams.get("token_hash");
  const tipoParam = (searchParams.get("type") ?? "recovery") as TipoConfirmacao;
  const tipo: TipoConfirmacao = TITULO_POR_TIPO[tipoParam] ? tipoParam : "recovery";
  const next = searchParams.get("next") || DESTINO_POR_TIPO[tipo];

  const [estado, setEstado] = useState<"idle" | "confirmando" | "erro">(
    tokenHash ? "idle" : "erro"
  );

  async function confirmar() {
    if (!tokenHash) return;
    setEstado("confirmando");

    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: tipo,
    });

    if (error) {
      setEstado("erro");
      return;
    }

    router.push(next);
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <span className="rotulo text-cyan">Confirmação</span>
          <h1 className="titulo mt-2 text-3xl font-semibold">
            {TITULO_POR_TIPO[tipo]}
          </h1>
        </div>

        {estado === "erro" ? (
          <div className="space-y-5">
            <Alerta tipo="erro">
              Este link é inválido ou já expirou. Solicite um novo link.
            </Alerta>
            <Link
              href="/recuperar-senha"
              className="rotulo block border border-cyan bg-cyan/10 px-6 py-3 text-center text-cyan transition-colors hover:bg-cyan hover:text-base-bg"
            >
              Solicitar novo link
            </Link>
          </div>
        ) : (
          <div className="space-y-5 text-center">
            <p className="text-sm leading-relaxed text-white/50">
              Por segurança, confirme clicando no botão abaixo.
            </p>
            <button
              type="button"
              onClick={confirmar}
              disabled={estado === "confirmando"}
              className="rotulo w-full border border-cyan bg-cyan/10 px-6 py-3 text-cyan
                         transition-colors hover:bg-cyan hover:text-base-bg disabled:opacity-40"
            >
              {estado === "confirmando" ? "Confirmando..." : "Confirmar"}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
