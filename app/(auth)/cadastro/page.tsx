"use client";

import Link from "next/link";
import { useFormState } from "react-dom";
import { cadastrar, type EstadoForm } from "@/app/actions/auth";
import { Campo, BotaoSubmit, Alerta } from "@/components/ui";

const estadoInicial: EstadoForm = {};

export default function CadastroPage() {
  const [estado, acao] = useFormState(cadastrar, estadoInicial);

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <span className="rotulo text-cyan">
            Criar acesso
          </span>
          <h1 className="titulo mt-2 text-3xl font-semibold">
            Comece a usar o SIG
          </h1>
          <p className="mt-3 text-xs leading-relaxed text-white/40">
            Se você já criou uma conta mas não concluiu o cadastro do
            estabelecimento, preencha novamente com o mesmo e-mail e senha
            para finalizar.
          </p>
        </div>

        <form action={acao} className="space-y-4">
          {estado.erro && <Alerta tipo="erro">{estado.erro}</Alerta>}
          {estado.sucesso && <Alerta tipo="sucesso">{estado.sucesso}</Alerta>}

          <Campo
            label="Nome do estabelecimento"
            name="nome_empresa"
            placeholder="Cantina Bella Napoli"
          />
          <Campo label="Seu nome" name="nome_usuario" placeholder="Maria Silva" />
          <Campo
            label="E-mail"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="voce@restaurante.com.br"
          />
          <Campo
            label="Telefone"
            name="telefone"
            type="tel"
            required={false}
            placeholder="(11) 99999-9999"
          />
          <Campo
            label="Senha"
            name="senha"
            type="password"
            autoComplete="new-password"
            placeholder="Mínimo 8 caracteres"
          />

          <label className="flex items-start gap-3 pt-2 text-xs leading-relaxed text-white/60">
            <input
              type="checkbox"
              name="consentimento"
              required
              className="mt-0.5 h-4 w-4 shrink-0 accent-[#4EC5DC]"
            />
            <span>
              Autorizo o tratamento dos meus dados pessoais e dos dados do meu
              estabelecimento para operação do sistema, conforme a Lei Geral de
              Proteção de Dados (LGPD). Posso solicitar exclusão a qualquer
              momento.
            </span>
          </label>

          <div className="pt-2">
            <BotaoSubmit>Criar conta</BotaoSubmit>
          </div>
        </form>

        <p className="mt-8 text-center text-sm text-white/50">
          Já tem conta?{" "}
          <Link href="/login" className="text-ambar hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </main>
  );
}
