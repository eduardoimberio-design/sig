"use client";

import Link from "next/link";
import { useFormState } from "react-dom";
import { cadastrarAfiliado, type EstadoForm } from "@/app/actions/afiliados";
import { Campo, BotaoSubmit, Alerta } from "@/components/ui";

const estadoInicial: EstadoForm = {};

export default function AfiliadosPage() {
  const [estado, acao] = useFormState(cadastrarAfiliado, estadoInicial);

  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <div className="grid gap-12 lg:grid-cols-2">
        <section>
          <span className="rotulo text-cyan">Programa de afiliados</span>
          <h1 className="titulo mt-3 text-4xl font-semibold leading-tight">
            Indique o SIG para quem trabalha com food service
          </h1>
          <p className="mt-5 text-white/60">
            Para consultores, contadores, professores de gastronomia, chefs e
            fornecedores — quem o dono de restaurante escuta antes de decidir.
          </p>

          <div className="mt-10 space-y-6">
            <div className="painel p-5">
              <p className="rotulo text-ambar">Você recebe</p>
              <p className="cifra mt-2 text-3xl text-ambar">15%</p>
              <p className="mt-2 text-sm text-white/60">
                de cada pagamento do cliente que você indicou — na primeira
                compra e em todas as renovações, enquanto ele continuar
                cliente.
              </p>
            </div>

            <div className="painel p-5">
              <p className="rotulo text-cyan">Quem você indica recebe</p>
              <p className="mt-2 text-sm text-white/60">
                30 dias de acesso a mais na primeira compra, em qualquer plano a
                partir do Trimestral.
              </p>
            </div>
          </div>

          <div className="mt-10 space-y-3 text-sm text-white/50">
            <p className="rotulo text-white/40">Como funciona</p>
            <p>
              <span className="text-cyan">1.</span> Você se cadastra aqui. Seu
              cadastro é aprovado pelo SIG.
            </p>
            <p>
              <span className="text-cyan">2.</span> Você recebe um link e um
              código próprios.
            </p>
            <p>
              <span className="text-cyan">3.</span> O cliente chega pelo seu
              link, ou digita seu código no cadastro.
            </p>
            <p>
              <span className="text-cyan">4.</span> A cada pagamento dele, sua
              comissão aparece no seu painel. O repasse é mensal, por Pix.
            </p>
          </div>
        </section>

        <section className="painel h-fit p-8">
          <h2 className="titulo text-2xl">Quero ser afiliado</h2>
          <p className="mt-2 text-sm text-white/45">
            Já tem cadastro?{" "}
            <Link href="/login" className="text-cyan hover:underline">
              Entrar
            </Link>
          </p>

          <form action={acao} className="mt-6 space-y-4">
            {estado.erro && <Alerta tipo="erro">{estado.erro}</Alerta>}
            {estado.sucesso && <Alerta tipo="sucesso">{estado.sucesso}</Alerta>}

            <Campo label="Nome completo" name="nome" autoComplete="name" />
            <Campo label="E-mail" name="email" type="email" autoComplete="email" />
            <Campo label="WhatsApp" name="whatsapp" placeholder="(11) 90000-0000" />
            <Campo
              label="O que você faz"
              name="profissao"
              placeholder="Consultor, contador, chef…"
            />
            <Campo
              label="Senha"
              name="senha"
              type="password"
              autoComplete="new-password"
              placeholder="Mínimo 8 caracteres"
            />

            <label className="flex items-start gap-3 pt-2 text-xs leading-relaxed text-white/55">
              <input type="checkbox" name="aceite" className="mt-0.5" />
              <span>
                Li e aceito as regras do programa: comissão de 15% sobre
                pagamentos confirmados, repasse mensal por Pix, cancelamento da
                comissão em caso de estorno, e aprovação do cadastro pelo SIG.
                Meus dados serão usados apenas para o programa, conforme a LGPD.
              </span>
            </label>

            <div className="pt-2">
              <BotaoSubmit>Enviar cadastro</BotaoSubmit>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
