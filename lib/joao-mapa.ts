/**
 * O mapa do sistema, escrito à mão.
 *
 * O João só conhece o que está aqui. É de propósito: se ele
 * inventasse uma tela ou um botão que não existe, o cliente iria
 * procurar, não acharia, e perderia a confiança no sistema inteiro.
 * Ao criar tela nova, acrescente aqui — senão o João não vai saber.
 */

export const MAPA_SISTEMA = `
ÁREAS DO SISTEMA (todas dentro do painel, após o login):

Painel inicial — /painel
Lista todos os agentes e mostra pendências do negócio (insumo abaixo do mínimo, conta vencida, documento esperando confirmação). É a tela de casa.

Agente Financeiro — /painel/financeiro
Lançar contas a pagar e a receber, marcar como pago, ver fluxo de caixa, DRE do período e concentração de gastos por fornecedor. O filtro de período fica no topo. Botão "Paguei"/"Recebi" dá baixa na conta.

Agente de Estoque — /painel/estoque
Cadastrar insumos (com estoque mínimo), montar produtos e a ficha técnica de cada um, acompanhar o CMV, registrar equipamentos. Dentro dele há também:
  - Leitura de documentos — /painel/estoque/documentos
    Sobe XML da NF-e (leitura exata) ou PDF/foto da nota (leitura por IA). Os itens da nota são vinculados aos insumos e o sistema memoriza o vínculo para as próximas notas. Nada entra no estoque sem confirmação.
  - Questionário operacional — /painel/estoque/questionario
    Perguntas sobre a operação que ajudam os agentes a entender o negócio.

Agente de Marketing — /painel/marketing
Gera post, carrossel, story e campanha com base no cardápio cadastrado. Em "Configurar" define tom de voz, público-alvo e diferenciais. Quanto mais produtos cadastrados no Estoque, melhor o conteúdo.

Consultor IA — /painel/consultor
Escolhe um período e gera um relatório de análise e recomendações a partir do que já foi lançado no Financeiro e no Estoque. Não coleta dado novo — interpreta o que existe.
  - Conselheiro — /painel/consultor/conselheiro
    Para um problema ou uma decisão específica. Levanta causas prováveis, aprofunda até a causa raiz, monta plano de ação com responsável, prazo e custo, e organiza o cenário em decisões estratégicas.

Agente de Equipe — /painel/equipe
Escala de trabalho, registro de ausências e controle de treinamentos da equipe.

Métricas — /painel/metricas
Relatórios por período, com exportação em Excel e PDF.

Acesso e planos — /painel/acesso
Onde se compra ou renova o acesso e onde se resgata voucher.

RECURSO PRESENTE EM VÁRIOS AGENTES — "Subir documento":
No Financeiro, Estoque, Marketing, Equipe e Conselheiro existe um card para enviar print, foto ou PDF. Serve para dar contexto ao agente (ex.: print do painel do Instagram no Marketing, print de conversa no Conselheiro). A IA lê e mostra o que entendeu; o cliente confere, corrige se precisar e confirma. Só depois de confirmado o agente usa aquela informação.

COMO COMEÇAR (ordem que funciona para quem chegou agora):
1. Cadastrar insumos e produtos no Estoque — é a base de quase tudo.
2. Montar a ficha técnica dos produtos, para o CMV fazer sentido.
3. Lançar as contas no Financeiro por pelo menos algumas semanas.
4. Só então pedir relatório ao Consultor — antes disso ele tem pouco com que trabalhar.

O QUE O SISTEMA NÃO FAZ (nunca prometa nada disso):
- Não emite nota fiscal.
- Não integra com PDV, iFood, delivery ou maquininha.
- Não controla venda por prato individual, então não diz qual prato vende mais.
- Não envia mensagem por WhatsApp ao cliente final.
- Não faz folha de pagamento.
`;

export const SOBRE_O_SIG = `
O SIG (Sistema Inteligente de Gestão) é uma plataforma de gestão para
pequenos negócios de food service — restaurante, bar, lanchonete,
cafeteria, padaria, food truck, delivery.

A diferença dele: em vez de só mostrar número, os agentes interpretam
os dados e dizem o que fazer — como ter um consultor acompanhando o
negócio todo dia.

O acesso é pré-pago: compra-se um período, sem assinatura recorrente e
sem fidelidade. Dias comprados nunca são perdidos — uma nova compra
soma ao prazo que já existe.
`;
