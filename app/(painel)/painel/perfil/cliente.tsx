"use client";

import { useFormState } from "react-dom";
import {
  salvarDadosCadastrais,
  salvarMeuNome,
  type EstadoForm,
} from "@/app/actions/perfil";
import { Alerta, BotaoSubmit } from "@/components/ui";

const estadoInicial: EstadoForm = {};

const TIPOS = [
  "Restaurante",
  "Bar",
  "Lanchonete",
  "Cafeteria",
  "Padaria",
  "Pizzaria",
  "Food truck",
  "Delivery",
  "Outro",
];

function CampoTexto({
  label,
  name,
  defaultValue,
  placeholder,
  apoio,
  maxLength,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  placeholder?: string;
  apoio?: string;
  maxLength?: number;
}) {
  return (
    <label className="block">
      <span className="rotulo mb-2 block text-white/45">{label}</span>
      <input
        name={name}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        maxLength={maxLength}
        className="campo w-full px-4 py-2.5 text-sm placeholder-white/25"
      />
      {apoio && <span className="mt-1 block text-xs text-white/30">{apoio}</span>}
    </label>
  );
}

export function FormEmpresa({ empresa }: { empresa: any }) {
  const [estado, acao] = useFormState(salvarDadosCadastrais, estadoInicial);

  return (
    <form action={acao} className="painel p-6">
      <p className="rotulo mb-1 text-cyan">Estabelecimento</p>
      <p className="mb-5 text-sm text-white/45">
        O CNPJ e o endereço aparecem em relatórios e são usados para emitir
        cobrança. Vale manter em dia.
      </p>

      {estado.erro && (
        <div className="mb-4">
          <Alerta tipo="erro">{estado.erro}</Alerta>
        </div>
      )}
      {estado.sucesso && (
        <div className="mb-4">
          <Alerta tipo="sucesso">{estado.sucesso}</Alerta>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <CampoTexto
          label="Nome do estabelecimento"
          name="nome"
          defaultValue={empresa.nome}
        />
        <CampoTexto
          label="Razão social"
          name="razao_social"
          defaultValue={empresa.razao_social}
          placeholder="Como está no contrato social"
        />
        <CampoTexto
          label="CNPJ"
          name="cnpj"
          defaultValue={empresa.cnpj}
          placeholder="00.000.000/0000-00"
          apoio="Os dígitos são conferidos ao salvar."
        />
        <CampoTexto
          label="Telefone"
          name="telefone"
          defaultValue={empresa.telefone}
          placeholder="(11) 90000-0000"
        />
        <CampoTexto
          label="E-mail de contato"
          name="email_contato"
          defaultValue={empresa.email_contato}
          placeholder="contato@seunegocio.com.br"
        />

        <label className="block">
          <span className="rotulo mb-2 block text-white/45">
            Tipo de negócio
          </span>
          <select
            name="tipo_negocio"
            defaultValue={empresa.tipo_negocio ?? ""}
            className="campo w-full px-4 py-2.5 text-sm"
          >
            <option value="">Não informado</option>
            {TIPOS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>

        <CampoTexto
          label="Endereço"
          name="endereco"
          defaultValue={empresa.endereco}
          placeholder="Rua, número, bairro"
        />
        <CampoTexto
          label="Cidade"
          name="cidade"
          defaultValue={empresa.cidade}
        />
        <CampoTexto
          label="UF"
          name="uf"
          defaultValue={empresa.uf}
          placeholder="SP"
          maxLength={2}
        />
        <CampoTexto
          label="CEP"
          name="cep"
          defaultValue={empresa.cep}
          placeholder="00000-000"
        />
      </div>

      <div className="mt-5">
        <BotaoSubmit>Salvar dados</BotaoSubmit>
      </div>
    </form>
  );
}

export function FormUsuario({ nome }: { nome: string }) {
  const [estado, acao] = useFormState(salvarMeuNome, estadoInicial);

  return (
    <form action={acao} className="painel p-6">
      <p className="rotulo mb-1 text-cyan">Seus dados</p>
      <p className="mb-5 text-sm text-white/45">
        É este nome que aparece na saudação do painel.
      </p>

      {estado.erro && (
        <div className="mb-4">
          <Alerta tipo="erro">{estado.erro}</Alerta>
        </div>
      )}
      {estado.sucesso && (
        <div className="mb-4">
          <Alerta tipo="sucesso">{estado.sucesso}</Alerta>
        </div>
      )}

      <CampoTexto label="Seu nome" name="nome" defaultValue={nome} />

      <div className="mt-5">
        <BotaoSubmit>Salvar nome</BotaoSubmit>
      </div>
    </form>
  );
}
