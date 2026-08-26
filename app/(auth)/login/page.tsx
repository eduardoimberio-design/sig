"use client";

import Link from "next/link";
import { useFormState } from "react-dom";
import { entrar, type EstadoForm } from "@/app/actions/auth";
import { Campo, BotaoSubmit, Alerta } from "@/components/ui";

const estadoInicial: EstadoForm = {};

export default function LoginPage() {
  const [estado, acao] = useFormState(entrar, estadoInicial);

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <span className="rotulo text-cyan">
            Food Service Intelligence
          </span>
          <h1 className="titulo mt-2 text-4xl font-semibold">SIG</h1>
          <p className="mt-2 text-sm text-white/50">
            Sistema Inteligente de Gestão
          </p>
        </div>

        <form action={acao} className="space-y-4">
          {estado.erro && <Alerta tipo="erro">{estado.erro}</Alerta>}

          <Campo
            label="E-mail"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="voce@restaurante.com.br"
          />
          <div>
            <Campo
              label="Senha"
              name="senha"
              type="password"
              autoComplete="current-password"
            />
            <div className="mt-2 text-right">
              <Link
                href="/recuperar-senha"
                className="text-xs text-cyan/70 hover:text-cyan hover:underline"
              >
                Esqueci minha senha
              </Link>
            </div>
          </div>

          <div className="pt-2">
            <BotaoSubmit>Entrar</BotaoSubmit>
          </div>
        </form>

        <p className="mt-3 text-center text-sm text-white/50">
          Ainda não tem conta?{" "}
          <Link href="/cadastro" className="text-ambar hover:underline">
            Criar acesso
          </Link>
        </p>
      </div>
    </main>
  );
}
