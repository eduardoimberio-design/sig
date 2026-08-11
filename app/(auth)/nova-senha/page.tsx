"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Campo, Alerta } from "@/components/ui";

/**
 * A troca de senha acontece INTEIRAMENTE no navegador, de propósito.
 *
 * O link do e-mail entrega o token na âncora da URL (#access_token=…),
 * que nunca é enviada ao servidor. A biblioteca do Supabase converte
 * isso em sessão no lado do cliente — então é aqui, e só aqui, que
 * existe uma sessão válida para autorizar a troca.
 */
export default function NovaSenhaPage() {
  const router = useRouter();
  const [verificando, setVerificando] = useState(true);
  const [linkValido, setLinkValido] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    // O evento PASSWORD_RECOVERY dispara quando a biblioteca termina
    // de processar o token da URL. Esperar por ele evita a corrida
    // entre a leitura da sessão e o processamento do link.
    const { data: listener } = supabase.auth.onAuthStateChange(
      (evento, sessao) => {
        if (evento === "PASSWORD_RECOVERY" || sessao) {
          setLinkValido(true);
          setVerificando(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setLinkValido(true);
      setVerificando(false);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function salvar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);

    const form = new FormData(e.currentTarget);
    const senha = String(form.get("senha") ?? "");
    const confirmacao = String(form.get("confirmacao") ?? "");

    if (senha.length < 8) {
      setErro("A senha precisa ter ao menos 8 caracteres.");
      return;
    }
    if (senha !== confirmacao) {
      setErro("As senhas não coincidem.");
      return;
    }

    setSalvando(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: senha });
    setSalvando(false);

    if (error) {
      setErro(
        error.message.toLowerCase().includes("same")
          ? "A nova senha precisa ser diferente da anterior."
          : "Não foi possível alterar a senha. Solicite um novo link."
      );
      return;
    }

    router.push("/painel");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <span className="rotulo text-cyan">Nova senha</span>
          <h1 className="titulo mt-2 text-3xl font-semibold">
            Defina sua senha
          </h1>
        </div>

        {verificando ? (
          <p className="text-center text-sm text-white/40">
            Verificando o link...
          </p>
        ) : !linkValido ? (
          <div className="space-y-5">
            <Alerta tipo="erro">
              Este link é inválido ou já expirou. Solicite a recuperação de
              senha novamente.
            </Alerta>
            <Link
              href="/recuperar-senha"
              className="rotulo block border border-cyan bg-cyan/10 px-6 py-3 text-center text-cyan transition-colors hover:bg-cyan hover:text-base-bg"
            >
              Solicitar novo link
            </Link>
          </div>
        ) : (
          <form onSubmit={salvar} className="space-y-4">
            {erro && <Alerta tipo="erro">{erro}</Alerta>}

            <Campo
              label="Nova senha"
              name="senha"
              type="password"
              autoComplete="new-password"
              placeholder="Mínimo 8 caracteres"
            />
            <Campo
              label="Confirme a nova senha"
              name="confirmacao"
              type="password"
              autoComplete="new-password"
            />

            <div className="pt-2">
              <button
                type="submit"
                disabled={salvando}
                className="rotulo w-full border border-cyan bg-cyan/10 px-6 py-3 text-cyan
                           transition-colors hover:bg-cyan hover:text-base-bg disabled:opacity-40"
              >
                {salvando ? "Salvando..." : "Salvar nova senha"}
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
