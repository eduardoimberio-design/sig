"use client";

import { useFormState } from "react-dom";
import { completarCadastro, type EstadoForm } from "@/app/actions/auth";
import { sair } from "@/app/actions/auth";
import { Campo, BotaoSubmit, Alerta } from "@/components/ui";

const estadoInicial: EstadoForm = {};

export function FormCompletarCadastro({ email }: { email: string }) {
  const [estado, acao] = useFormState(completarCadastro, estadoInicial);

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="rotulo text-cyan">Último passo</span>
          <h1 className="titulo mt-2 text-3xl font-semibold">
            Falta o seu estabelecimento
          </h1>
          <p className="mt-3 text-sm text-white/50">
            Sua conta já existe. Só precisamos do nome do negócio para liberar
            o painel.
          </p>
        </div>

        <div className="painel mb-6 p-4">
          <p className="rotulo text-white/35">Conta</p>
          <p className="mt-1 break-all text-sm text-white/70">{email}</p>
          <form action={sair} className="mt-3">
            <button className="text-xs text-white/35 underline hover:text-cyan">
              Não é você? Sair e entrar com outra conta
            </button>
          </form>
        </div>

        <form action={acao} className="space-y-4">
          {estado.erro && <Alerta tipo="erro">{estado.erro}</Alerta>}

          <Campo
            label="Nome do estabelecimento"
            name="nome_empresa"
            placeholder="Comidaria Paulista"
          />
          <Campo label="Seu nome" name="nome_usuario" placeholder="Eduardo" />
          <Campo
            label="Telefone (opcional)"
            name="telefone"
            placeholder="(11) 90000-0000"
          />

          <div className="pt-2">
            <BotaoSubmit>Concluir e entrar</BotaoSubmit>
          </div>
        </form>
      </div>
    </main>
  );
}
