"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { salvarQuestionario, type EstadoForm } from "@/app/actions/questionario";
import {
  salvarColaborador,
  removerColaborador,
  salvarFornecedor,
  removerFornecedor,
} from "@/app/actions/pessoas";
import { Campo, BotaoSubmit, Alerta } from "@/components/ui";

const estadoInicial: EstadoForm = {};

// Identifica o formulário principal do questionário. Campos fora da
// árvore desse <form> se associam a ele através do atributo `form`
// abaixo — isso evita aninhar <form> dentro de <form> (inválido em
// HTML) nos blocos de Colaboradores e Fornecedores, que têm seus
// próprios formulários de adicionar/remover.
const FORM_ID = "form-questionario";

const DIAS = [
  { valor: "seg", rotulo: "Seg" },
  { valor: "ter", rotulo: "Ter" },
  { valor: "qua", rotulo: "Qua" },
  { valor: "qui", rotulo: "Qui" },
  { valor: "sex", rotulo: "Sex" },
  { valor: "sab", rotulo: "Sáb" },
  { valor: "dom", rotulo: "Dom" },
];

const PRIORIDADES = [
  { valor: "custo", rotulo: "Custo alto" },
  { valor: "desperdicio", rotulo: "Desperdício" },
  { valor: "atraso", rotulo: "Atraso no serviço" },
  { valor: "inconsistencia", rotulo: "Inconsistência do prato" },
  { valor: "dependencia", rotulo: "Dependência de pessoas" },
  { valor: "sobrecarga", rotulo: "Equipe sobrecarregada" },
  { valor: "falta_padrao", rotulo: "Falta de padrão para treinar" },
];

function Secao({
  numero,
  titulo,
  children,
}: {
  numero: string;
  titulo: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="painel p-6">
      <div className="mb-5 flex items-baseline gap-3">
        <span className="rotulo text-cyan">{numero}</span>
        <h2 className="titulo text-lg">{titulo}</h2>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Rotulo({ children }: { children?: React.ReactNode }) {
  return <span className="rotulo mb-2 block text-white/45">{children}</span>;
}

function Select({
  name,
  defaultValue,
  opcoes,
}: {
  name: string;
  defaultValue?: string | null;
  opcoes: { valor: string; rotulo: string }[];
}) {
  return (
    <select
      name={name}
      form={FORM_ID}
      defaultValue={defaultValue ?? ""}
      className="campo w-full px-4 py-2.5 text-sm"
    >
      <option value="">Não informado</option>
      {opcoes.map((o) => (
        <option key={o.valor} value={o.valor}>
          {o.rotulo}
        </option>
      ))}
    </select>
  );
}

function MultiCheck({
  opcoes,
  selecionados,
  onToggle,
}: {
  opcoes: { valor: string; rotulo: string }[];
  selecionados: string[];
  onToggle: (valor: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {opcoes.map((o) => {
        const ativo = selecionados.includes(o.valor);
        return (
          <button
            key={o.valor}
            type="button"
            onClick={() => onToggle(o.valor)}
            className={`rotulo border px-3 py-1.5 transition-colors ${
              ativo
                ? "border-cyan bg-cyan/10 text-cyan"
                : "border-base-border text-white/45 hover:text-white/70"
            }`}
          >
            {o.rotulo}
          </button>
        );
      })}
    </div>
  );
}

export function FormQuestionario({
  dados,
  colaboradores,
  fornecedores,
}: {
  dados: any;
  colaboradores: any[];
  fornecedores: any[];
}) {
  const [estado, acao] = useFormState(salvarQuestionario, estadoInicial);

  const [dias, setDias] = useState<string[]>(dados?.dias_funcionamento ?? []);
  const [prioridades, setPrioridades] = useState<string[]>(
    dados?.prioridades ?? []
  );

  function toggle(lista: string[], setLista: (v: string[]) => void, valor: string) {
    setLista(
      lista.includes(valor) ? lista.filter((v) => v !== valor) : [...lista, valor]
    );
  }

  return (
    <div className="space-y-6">
      {estado.erro && <Alerta tipo="erro">{estado.erro}</Alerta>}
      {estado.sucesso && <Alerta tipo="sucesso">{estado.sucesso}</Alerta>}

      {/* Campos com valor controlado por estado do React — associados
          ao formulário principal à distância, via o atributo form. */}
      <input type="hidden" name="dias_funcionamento" value={dias.join(",")} form={FORM_ID} />
      <input type="hidden" name="prioridades" value={prioridades.join(",")} form={FORM_ID} />

      {/* Bloco 1 — Perfil da operação */}
      <Secao numero="01" titulo="Perfil da operação">
        <div>
          <Rotulo>Tipo de serviço</Rotulo>
          <Select
            name="tipo_servico"
            defaultValue={dados?.tipo_servico}
            opcoes={[
              { valor: "a_la_carte", rotulo: "À la carte" },
              { valor: "self_service", rotulo: "Self-service por kg" },
              { valor: "buffet", rotulo: "Buffet" },
              { valor: "rodizio", rotulo: "Rodízio" },
              { valor: "delivery", rotulo: "Delivery" },
              { valor: "industrial", rotulo: "Operação industrial (400+ refeições/dia)" },
            ]}
          />
        </div>

        <div>
          <Rotulo>Dias de funcionamento</Rotulo>
          <MultiCheck
            opcoes={DIAS}
            selecionados={dias}
            onToggle={(v) => toggle(dias, setDias, v)}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Rotulo>Refeições/dia — média</Rotulo>
            <input
              name="refeicoes_dia_media"
              type="number"
              form={FORM_ID}
              defaultValue={dados?.refeicoes_dia_media ?? ""}
              className="campo w-full px-4 py-2.5 text-sm"
            />
          </div>
          <div>
            <Rotulo>Refeições/dia — pico</Rotulo>
            <input
              name="refeicoes_dia_pico"
              type="number"
              form={FORM_ID}
              defaultValue={dados?.refeicoes_dia_pico ?? ""}
              className="campo w-full px-4 py-2.5 text-sm"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <Rotulo>Dia mais forte</Rotulo>
            <Select
              name="dia_mais_forte"
              defaultValue={dados?.dia_mais_forte}
              opcoes={DIAS.map((d) => ({ valor: d.valor, rotulo: d.rotulo }))}
            />
          </div>
          <div>
            <Rotulo>Mês de maior movimento</Rotulo>
            <input
              name="mes_maior_movimento"
              form={FORM_ID}
              defaultValue={dados?.mes_maior_movimento ?? ""}
              placeholder="Ex.: dezembro"
              className="campo w-full px-4 py-2.5 text-sm"
            />
          </div>
          <div>
            <Rotulo>Mês de menor movimento</Rotulo>
            <input
              name="mes_menor_movimento"
              form={FORM_ID}
              defaultValue={dados?.mes_menor_movimento ?? ""}
              placeholder="Ex.: fevereiro"
              className="campo w-full px-4 py-2.5 text-sm"
            />
          </div>
        </div>
      </Secao>

      {/* Bloco 2 — Equipe (campos agregados) */}
      <Secao numero="02" titulo="Equipe">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Rotulo>Rotatividade nos últimos 12 meses</Rotulo>
            <Select
              name="rotatividade_12m"
              defaultValue={dados?.rotatividade_12m}
              opcoes={[
                { valor: "baixa", rotulo: "Baixa" },
                { valor: "media", rotulo: "Média" },
                { valor: "alta", rotulo: "Alta" },
              ]}
            />
          </div>
        </div>

        <div>
          <Rotulo>
            Se a pessoa mais experiente faltar amanhã, o que para de
            funcionar?
          </Rotulo>
          <textarea
            name="dependencia_pessoa_chave"
            form={FORM_ID}
            defaultValue={dados?.dependencia_pessoa_chave ?? ""}
            rows={2}
            placeholder="Ex.: ninguém mais sabe fazer o molho da casa"
            className="campo w-full px-4 py-2.5 text-sm"
          />
        </div>
      </Secao>

      {/* Colaboradores — fora do form principal: tem forms próprios */}
      <Secao numero="02.1" titulo="Colaboradores da cozinha">
        <GestaoColaboradores colaboradores={colaboradores} />
      </Secao>

      {/* Bloco 3 — Produção atual */}
      <Secao numero="03" titulo="Como a produção acontece hoje">
        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 text-sm text-white/70">
            <input
              type="checkbox"
              name="produz_antecipado"
              form={FORM_ID}
              defaultChecked={dados?.produz_antecipado}
              className="h-4 w-4 accent-[#4EC5DC]"
            />
            Produz com antecedência
          </label>
          <label className="flex items-center gap-2 text-sm text-white/70">
            <input
              type="checkbox"
              name="mise_en_place_documentado"
              form={FORM_ID}
              defaultChecked={dados?.mise_en_place_documentado}
              className="h-4 w-4 accent-[#4EC5DC]"
            />
            Mise en place documentado
          </label>
          <label className="flex items-center gap-2 text-sm text-white/70">
            <input
              type="checkbox"
              name="porcionamento_padronizado"
              form={FORM_ID}
              defaultChecked={dados?.porcionamento_padronizado}
              className="h-4 w-4 accent-[#4EC5DC]"
            />
            Porcionamento padronizado
          </label>
        </div>

        <div>
          <Rotulo>
            Observações — como o cozinheiro sabe o que preparar, o que
            acontece com sobras, etc.
          </Rotulo>
          <textarea
            name="notas_producao_atual"
            form={FORM_ID}
            defaultValue={dados?.notas_producao_atual ?? ""}
            rows={3}
            className="campo w-full px-4 py-2.5 text-sm"
          />
        </div>
      </Secao>

      {/* Bloco 4 — Fornecimento (campo agregado) */}
      <Secao numero="04" titulo="Fornecimento">
        <div>
          <Rotulo>Prazo entre pedido e entrega (observação geral)</Rotulo>
          <input
            name="prazo_pedido_entrega"
            form={FORM_ID}
            defaultValue={dados?.prazo_pedido_entrega ?? ""}
            placeholder="Ex.: hortifruti é no mesmo dia, secos levam 2 dias"
            className="campo w-full px-4 py-2.5 text-sm"
          />
        </div>
      </Secao>

      {/* Fornecedores — fora do form principal: tem forms próprios */}
      <Secao numero="04.1" titulo="Fornecedores">
        <GestaoFornecedores fornecedores={fornecedores} />
      </Secao>

      {/* Bloco 5 — Prioridade */}
      <Secao numero="05" titulo="O que mais incomoda hoje">
        <p className="text-xs text-white/40">
          Selecione todos que se aplicam — a ordem de clique define a
          prioridade.
        </p>
        <MultiCheck
          opcoes={PRIORIDADES}
          selecionados={prioridades}
          onToggle={(v) => toggle(prioridades, setPrioridades, v)}
        />
        {prioridades.length > 0 && (
          <p className="text-xs text-white/35">
            Ordem: {prioridades.map((p, i) => `${i + 1}º`).join(", ")}
          </p>
        )}
      </Secao>

      {/* O <form> em si fica vazio de campos visuais — todos os campos
          acima se associam a ele pelo atributo form={FORM_ID}. Isso é
          o que permite Colaboradores e Fornecedores, com seus próprios
          formulários, ficarem entre os blocos sem aninhamento inválido. */}
      <form id={FORM_ID} action={acao} className="max-w-xs">
        <BotaoSubmit>Salvar questionário</BotaoSubmit>
      </form>
    </div>
  );
}

// ---------------------------------------------------------
// COLABORADORES
// ---------------------------------------------------------
const NIVEL_ROTULO: Record<string, string> = {
  tecnica: "Formação técnica",
  pratica: "Experiência prática",
  sem_experiencia: "Sem experiência prévia",
};

const TURNO_ROTULO: Record<string, string> = {
  manha: "Manhã",
  tarde: "Tarde",
  noite: "Noite",
  integral: "Integral",
};

function GestaoColaboradores({ colaboradores }: { colaboradores: any[] }) {
  const [aberto, setAberto] = useState(colaboradores.length === 0);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <Rotulo>Cadastro de colaboradores</Rotulo>
        <button
          type="button"
          onClick={() => setAberto(!aberto)}
          className="rotulo text-cyan hover:underline"
        >
          {aberto ? "Fechar" : "+ Adicionar"}
        </button>
      </div>

      {aberto && <FormColaborador />}

      {colaboradores.length > 0 ? (
        <div className="mt-3 space-y-2">
          {colaboradores.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between border border-base-border px-4 py-2.5 text-sm"
            >
              <div>
                <span className="text-white">{c.nome}</span>
                <span className="ml-2 text-white/40">{c.funcao}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-white/40">
                {c.nivel_qualificacao && (
                  <span>{NIVEL_ROTULO[c.nivel_qualificacao]}</span>
                )}
                {c.turno && <span>{TURNO_ROTULO[c.turno]}</span>}
                <form action={removerColaborador}>
                  <input type="hidden" name="id" value={c.id} />
                  <button className="text-negativo/70 hover:text-negativo">
                    remover
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      ) : (
        !aberto && (
          <p className="text-sm text-white/35">
            Nenhum colaborador cadastrado ainda.
          </p>
        )
      )}
    </div>
  );
}

function FormColaborador() {
  const [estado, acao] = useFormState(salvarColaborador, {} as EstadoForm);

  return (
    <form
      action={acao}
      className="mb-3 grid gap-3 border border-base-border p-4 sm:grid-cols-2 lg:grid-cols-4"
    >
      {estado.erro && (
        <div className="sm:col-span-2 lg:col-span-4">
          <Alerta tipo="erro">{estado.erro}</Alerta>
        </div>
      )}

      <input
        name="nome"
        required
        placeholder="Nome"
        className="campo px-3 py-2 text-sm"
      />
      <input
        name="funcao"
        required
        placeholder="Função — ex.: Cozinheiro"
        className="campo px-3 py-2 text-sm"
      />
      <select name="nivel_qualificacao" className="campo px-3 py-2 text-sm">
        <option value="">Qualificação</option>
        <option value="tecnica">Formação técnica</option>
        <option value="pratica">Experiência prática</option>
        <option value="sem_experiencia">Sem experiência prévia</option>
      </select>
      <div className="flex gap-2">
        <select name="turno" className="campo flex-1 px-3 py-2 text-sm">
          <option value="">Turno</option>
          <option value="manha">Manhã</option>
          <option value="tarde">Tarde</option>
          <option value="noite">Noite</option>
          <option value="integral">Integral</option>
        </select>
        <button className="rotulo shrink-0 border border-cyan bg-cyan/10 px-3 text-cyan hover:bg-cyan hover:text-base-bg">
          Add
        </button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------
// FORNECEDORES
// ---------------------------------------------------------
const FREQUENCIA_ROTULO: Record<string, string> = {
  diaria: "Diária",
  semanal: "Semanal",
  quinzenal: "Quinzenal",
  mensal: "Mensal",
  sob_demanda: "Sob demanda",
};

function GestaoFornecedores({ fornecedores }: { fornecedores: any[] }) {
  const [aberto, setAberto] = useState(fornecedores.length === 0);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <Rotulo>Cadastro de fornecedores</Rotulo>
        <button
          type="button"
          onClick={() => setAberto(!aberto)}
          className="rotulo text-cyan hover:underline"
        >
          {aberto ? "Fechar" : "+ Adicionar"}
        </button>
      </div>

      {aberto && <FormFornecedor />}

      {fornecedores.length > 0 ? (
        <div className="mt-3 space-y-2">
          {fornecedores.map((f) => (
            <div
              key={f.id}
              className="flex flex-wrap items-center justify-between gap-2 border border-base-border px-4 py-2.5 text-sm"
            >
              <div>
                <span className="text-white">{f.nome}</span>
                {f.categoria_fornecida && (
                  <span className="ml-2 text-white/40">
                    {f.categoria_fornecida}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-white/40">
                {f.dia_entrega?.length > 0 && (
                  <span>{f.dia_entrega.join(", ")}</span>
                )}
                {f.frequencia && <span>{FREQUENCIA_ROTULO[f.frequencia]}</span>}
                <form action={removerFornecedor}>
                  <input type="hidden" name="id" value={f.id} />
                  <button className="text-negativo/70 hover:text-negativo">
                    remover
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      ) : (
        !aberto && (
          <p className="text-sm text-white/35">
            Nenhum fornecedor cadastrado ainda.
          </p>
        )
      )}
    </div>
  );
}

function FormFornecedor() {
  const [estado, acao] = useFormState(salvarFornecedor, {} as EstadoForm);
  const [dias, setDias] = useState<string[]>([]);

  return (
    <form
      action={acao}
      className="mb-3 space-y-3 border border-base-border p-4"
    >
      {estado.erro && <Alerta tipo="erro">{estado.erro}</Alerta>}

      <input type="hidden" name="dia_entrega" value={dias.join(",")} />

      <div className="grid gap-3 sm:grid-cols-2">
        <input
          name="nome"
          required
          placeholder="Nome do fornecedor"
          className="campo px-3 py-2 text-sm"
        />
        <input
          name="categoria_fornecida"
          placeholder="Categoria — ex.: Hortifruti"
          className="campo px-3 py-2 text-sm"
        />
      </div>

      <div>
        <p className="rotulo mb-2 text-white/35">Dia de entrega</p>
        <MultiCheck
          opcoes={DIAS}
          selecionados={dias}
          onToggle={(v) =>
            setDias(dias.includes(v) ? dias.filter((d) => d !== v) : [...dias, v])
          }
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <select name="frequencia" className="campo px-3 py-2 text-sm">
          <option value="">Frequência</option>
          <option value="diaria">Diária</option>
          <option value="semanal">Semanal</option>
          <option value="quinzenal">Quinzenal</option>
          <option value="mensal">Mensal</option>
          <option value="sob_demanda">Sob demanda</option>
        </select>
        <input
          name="contato"
          placeholder="Contato (telefone/WhatsApp)"
          className="campo px-3 py-2 text-sm"
        />
      </div>

      <button className="rotulo border border-cyan bg-cyan/10 px-4 py-2 text-cyan hover:bg-cyan hover:text-base-bg">
        Adicionar fornecedor
      </button>
    </form>
  );
}
