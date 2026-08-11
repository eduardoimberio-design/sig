# SIG — Sistema Inteligente de Gestão

Módulo 1 (setup + schema multi-tenant) — pronto para receber as chaves de
ambiente e evoluir para os Módulos 2 e 3 (Financeiro e Estoque/CMV com
lógica dos agentes de IA).

## O que já está pronto nesta entrega

- Projeto Next.js (App Router) + TypeScript + Tailwind com a identidade
  visual do SIG (fundo escuro, acentos dourados, tipografia serifada).
- Clientes Supabase configurados para os 3 contextos: browser, server
  components e admin (service role, para webhooks).
- Middleware de sessão (protege `/painel/*`, redireciona usuário logado
  para fora de `/login`).
- Migration SQL completa (`supabase/migrations/0001_init_multi_tenant.sql`)
  com:
  - Infraestrutura multi-tenant (`empresas`, `usuarios_empresa`) e Row
    Level Security em todas as tabelas — cada empresa só enxerga seus
    próprios dados.
  - Schema do pilar **Financeiro**: `contas_pagar`, `contas_receber`.
  - Schema do pilar **Estoque/CMV**: `insumos`, `produtos`,
    `ficha_tecnica_itens`, `estoque_movimentos`.
  - Schema base do pilar **Comercial**: `conversas_whatsapp`,
    `mensagens_whatsapp` (a lógica do agente de IA entra no Módulo 4).

## Passo a passo para colocar no ar

### 1. Criar o projeto Supabase
1. Acesse https://supabase.com → **New Project**.
2. Anote a **Project URL** e a **anon public key** em
   *Project Settings → API*.
3. Em *Project Settings → API*, copie também a **service_role key**
   (nunca exponha essa chave no frontend).
4. Rode a migration: no SQL Editor do Supabase, cole o conteúdo de
   `supabase/migrations/0001_init_multi_tenant.sql` e execute. (Ou, com a
   Supabase CLI instalada: `supabase link` + `supabase db push`.)

### 2. Criar a chave da Anthropic
1. Acesse https://console.anthropic.com → **API Keys** → **Create Key**.
2. Copie a chave — ela vai alimentar o Consultor IA e o Agente Comercial
   nos próximos módulos.

### 3. Configurar variáveis de ambiente
```bash
cp .env.local.example .env.local
# preencha os valores obtidos nos passos 1 e 2
```

### 4. Rodar localmente
```bash
npm install
npm run dev
```

### 5. WhatsApp (360dialog) — pode ser feito em paralelo
1. Crie conta em https://www.360dialog.com/pt/.
2. Inicie o processo de conexão do número de WhatsApp Business (leva
   alguns dias para aprovação da Meta — vale começar isso já).
3. Quando aprovado, preencha `DIALOG360_API_KEY` e `DIALOG360_CHANNEL_ID`
   no `.env.local`.

## Próximos módulos (nesta ordem)

- **Módulo 2 — Autenticação e onboarding de empresas**: cadastro de nova
  empresa cliente do SIG, criação do primeiro usuário `owner`, tela de
  login.
- **Módulo 3 — Painel Financeiro**: CRUD de contas a pagar/receber,
  alertas de vencimento, dashboard de fluxo de caixa e DRE simplificado.
- **Módulo 4 — Painel de Estoque/CMV**: cadastro de insumos e ficha
  técnica, cálculo automático de CMV por produto, alertas de estoque
  mínimo, sugestão de pedidos.
- **Módulo 5 — Agente Comercial (WhatsApp)**: webhook de recebimento de
  mensagens via 360dialog, resposta via Claude API com RAG sobre o
  catálogo (`produtos`) da empresa.
- **Módulo 6 — Consultor IA**: orquestrador que lê os dados dos módulos
  2-4 e gera recomendações e relatórios periódicos.

Me avise quando tiver o Supabase e a chave Anthropic prontos que eu sigo
para o Módulo 2.
