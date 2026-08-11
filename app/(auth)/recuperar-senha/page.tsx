"use client";

import Link from "next/link";
import { useFormState } from "react-dom";
import { solicitarRecuperacaoSenha, type EstadoForm } from "@/app/actions/auth";
import { Campo, BotaoSubmit, Alerta } from "@/components/ui";

const estadoInicial: EstadoForm = {};

export default function RecuperarSenhaPage() {
  const [estado, acao] = useFormState(solicitarRecuperacaoSenha, estadoInicial);

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <span className="rotulo text-cyan">Recuperar acesso</span>
          <h1 className="titulo mt-2 text-3xl font-semibold">
            Esqueceu a senha?
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-white/50">
            Informe o e-mail da sua conta e enviaremos um link para você criar
            uma senha nova.
          </p>
        </div>

        <form action={acao} className="space-y-4">
          {estado.erro && <Alerta tipo="erro">{estado.erro}</Alerta>}
          {estado.sucesso && <Alerta tipo="sucesso">{estado.sucesso}</Alerta>}

          <Campo
            label="E-mail"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="voce@restaurante.com.br"
          />

          <div className="pt-2">
            <BotaoSubmit>Enviar link</BotaoSubmit>
          </div>
        </form>

        <p className="mt-8 text-center text-sm text-white/50">
          Lembrou a senha?{" "}
          <Link href="/login" className="text-ambar hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </main>
  );
}
