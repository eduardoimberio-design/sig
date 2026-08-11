-- =========================================================
-- SIG - Migration 0005: Módulo 4 (Estoque / Ficha Técnica)
--
-- Cobre: equipamentos com atributos que mudam o workflow,
-- questionário de produção, CMV por produto, e a fila de
-- documentos enviados para leitura (NF-e, PDF, foto).
-- =========================================================

-- -------------------------------------------------
-- EQUIPAMENTOS
-- Marca/modelo é texto livre (autocompletar no frontend).
-- O que importa para o agente são os atributos abaixo.
-- -------------------------------------------------
create type categoria_equipamento as enum (
  'coccao', 'preparo', 'conservacao', 'embalagem', 'apoio'
);

create table equipamentos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,

  tipo text not null,               -- ex.: "Forno combinado", "Câmara fria"
  categoria categoria_equipamento not null,
  marca_modelo text,                -- texto livre, autocompletar no front

  -- Atributos que efetivamente mudam o workflow de produção.
  -- Nem todo equipamento usa todos os campos — ficam nulos quando
  -- não se aplicam (ex.: capacidade_gn só existe em fornos).
  capacidade_gn integer,             -- fornos: nº de GN 1/1
  capacidade_litros numeric(10,2),   -- panelas, fritadeiras, câmaras
  capacidade_kg_ciclo numeric(10,2), -- abatedor/ultracongelador
  quantidade integer not null default 1,

  faz_vapor boolean,                 -- forno combinado
  possui_sonda boolean,
  basculante boolean,                -- panelas/frigideiras

  -- Os dois campos mais importantes: sem eles o agente assume
  -- competência plena e erra o workflow inteiro.
  dominio_equipe text,               -- 'pleno', 'parcial', 'baixo'
  restricoes text,                   -- texto livre: "só 1 pessoa sabe programar"

  estado text not null default 'bom', -- 'bom', 'manutencao', 'inativo'
  observacoes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_equipamentos_empresa on equipamentos(empresa_id, categoria);

alter table equipamentos enable row level security;
create policy "equipamentos_all" on equipamentos
  for all using (empresa_id in (select auth_empresa_ids()))
  with check (empresa_id in (select auth_empresa_ids()));

create trigger trg_equipamentos_updated before update on equipamentos
  for each row execute function set_updated_at();

-- -------------------------------------------------
-- QUESTIONÁRIO OPERACIONAL
-- Uma linha por empresa, todos os campos opcionais — o
-- cliente preenche aos poucos, o agente usa o que existir.
-- Blocos 1, 2, 3, 5 (estruturados). Blocos 4 e 6 (conversa)
-- ficam em texto livre por enquanto.
-- -------------------------------------------------
create table questionario_operacional (
  empresa_id uuid primary key references empresas(id) on delete cascade,

  -- Bloco 1: perfil da operação
  tipo_servico text,                 -- a_la_carte, self_service, buffet, rodizio, delivery
  dias_funcionamento text[],         -- ['seg','ter',...]
  refeicoes_dia_media integer,
  refeicoes_dia_pico integer,
  dia_mais_forte text,
  mes_maior_movimento text,
  mes_menor_movimento text,

  -- Bloco 3: equipe
  qtd_cozinha_por_turno integer,
  nivel_formacao_equipe text,        -- tecnica, pratica, sem_experiencia
  rotatividade_12m text,             -- baixa, media, alta
  dependencia_pessoa_chave text,     -- resposta livre: o que para se ela faltar

  -- Bloco 4 (conversa, texto livre por enquanto)
  produz_antecipado boolean,
  mise_en_place_documentado boolean,
  porcionamento_padronizado boolean,
  notas_producao_atual text,

  -- Bloco 5: fornecimento
  frequencia_entrega text,
  prazo_pedido_entrega text,
  fornecedor_critico_unico text,

  -- Bloco 6: prioridade (ranking em texto — o front trata a ordem)
  prioridades text[],                -- ex.: ['custo','desperdicio','padrao']

  ultima_revisao timestamptz,
  updated_at timestamptz not null default now()
);

alter table questionario_operacional enable row level security;
create policy "questionario_all" on questionario_operacional
  for all using (empresa_id in (select auth_empresa_ids()))
  with check (empresa_id in (select auth_empresa_ids()));

create trigger trg_questionario_updated before update on questionario_operacional
  for each row execute function set_updated_at();

-- Nasce vazio junto com a empresa, do mesmo jeito que config_financeiro
create or replace function criar_questionario_operacional()
returns trigger language plpgsql security definer as $$
begin
  insert into questionario_operacional (empresa_id) values (new.id)
  on conflict do nothing;
  return new;
end;
$$;

create trigger trg_empresa_questionario after insert on empresas
  for each row execute function criar_questionario_operacional();

insert into questionario_operacional (empresa_id)
select id from empresas on conflict do nothing;

-- =========================================================
-- CMV POR PRODUTO
-- Soma (quantidade do insumo na ficha × custo unitário do insumo)
-- e compara com o preço de venda do produto.
-- =========================================================
create or replace function cmv_por_produto(p_empresa_id uuid)
returns table (
  produto_id uuid,
  produto_nome text,
  preco_venda numeric,
  custo_ficha numeric,
  cmv_percentual numeric,
  margem_percentual numeric,
  qtd_insumos integer
)
language sql
security definer
as $$
  select
    p.id,
    p.nome,
    p.preco_venda,
    coalesce(sum(fi.quantidade * i.custo_unitario), 0) as custo_ficha,
    case when p.preco_venda > 0
      then round(coalesce(sum(fi.quantidade * i.custo_unitario), 0) * 100 / p.preco_venda, 2)
      else 0 end as cmv_percentual,
    case when p.preco_venda > 0
      then round(100 - (coalesce(sum(fi.quantidade * i.custo_unitario), 0) * 100 / p.preco_venda), 2)
      else 0 end as margem_percentual,
    count(fi.id)::integer as qtd_insumos
  from produtos p
  left join ficha_tecnica_itens fi on fi.produto_id = p.id
  left join insumos i on i.id = fi.insumo_id
  where p.empresa_id = p_empresa_id
    and exists (
      select 1 from usuarios_empresa
      where auth_user_id = auth.uid() and empresa_id = p_empresa_id
    )
  group by p.id, p.nome, p.preco_venda
  order by cmv_percentual desc nulls last;
$$;

-- Insumos abaixo do estoque mínimo — base do alerta de reposição
create or replace view insumos_estoque_baixo as
select id, empresa_id, nome, unidade_medida, estoque_atual, estoque_minimo,
       (estoque_minimo - estoque_atual) as falta
from insumos
where estoque_atual < estoque_minimo;

alter view insumos_estoque_baixo set (security_invoker = true);

-- =========================================================
-- LEITURA DE DOCUMENTOS (notas, relatórios de venda)
--
-- Princípio: o sistema nunca lança direto. Todo documento lido
-- vira uma proposta de lançamento, revisada e confirmada pelo
-- cliente antes de tocar em insumos, estoque ou contas.
-- =========================================================
create type tipo_documento as enum ('xml_nfe', 'pdf', 'imagem', 'planilha');
create type status_documento as enum (
  'processando', 'aguardando_revisao', 'confirmado', 'descartado', 'erro'
);

create table documentos_importados (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,

  tipo tipo_documento not null,
  nome_arquivo text not null,
  storage_path text not null,        -- Supabase Storage

  -- Metadados extraídos quando disponíveis (principalmente do XML)
  fornecedor_nome text,
  fornecedor_cnpj text,
  numero_nota text,
  data_emissao date,
  valor_total numeric(12,2),

  status status_documento not null default 'processando',
  erro_mensagem text,

  created_at timestamptz not null default now(),
  processado_em timestamptz,
  confirmado_em timestamptz
);

create index idx_documentos_empresa on documentos_importados(empresa_id, status);

alter table documentos_importados enable row level security;
create policy "documentos_all" on documentos_importados
  for all using (empresa_id in (select auth_empresa_ids()))
  with check (empresa_id in (select auth_empresa_ids()));

-- Cada item extraído do documento — um por linha da nota.
-- insumo_id só é preenchido depois que o cliente confirma o
-- vínculo (ou o sistema reconhece automaticamente pelo aprendizado).
create table documento_itens (
  id uuid primary key default gen_random_uuid(),
  documento_id uuid not null references documentos_importados(id) on delete cascade,
  empresa_id uuid not null references empresas(id) on delete cascade,

  descricao_original text not null,  -- exatamente como veio no documento
  quantidade numeric(12,4) not null,
  unidade_original text,
  valor_unitario numeric(12,4),
  valor_total numeric(12,2),

  insumo_id uuid references insumos(id) on delete set null,
  confianca_vinculo text,            -- 'automatico', 'sugerido', 'manual'

  incluir boolean not null default true, -- cliente pode desmarcar uma linha

  created_at timestamptz not null default now()
);

create index idx_doc_itens_documento on documento_itens(documento_id);

alter table documento_itens enable row level security;
create policy "documento_itens_all" on documento_itens
  for all using (empresa_id in (select auth_empresa_ids()))
  with check (empresa_id in (select auth_empresa_ids()));

-- -------------------------------------------------
-- APRENDIZADO DE NOMES
-- Vincula o texto exato de uma descrição de nota a um insumo
-- do cadastro. Uma vez ensinado, o sistema reconhece sozinho
-- da próxima vez — é a peça que evita reconciliação manual
-- toda nota, que é o motivo mais comum de abandono do recurso.
-- -------------------------------------------------
create table aprendizado_insumos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  texto_documento text not null,     -- normalizado (maiúsculo, sem acento)
  insumo_id uuid not null references insumos(id) on delete cascade,
  vezes_confirmado integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (empresa_id, texto_documento)
);

alter table aprendizado_insumos enable row level security;
create policy "aprendizado_all" on aprendizado_insumos
  for all using (empresa_id in (select auth_empresa_ids()))
  with check (empresa_id in (select auth_empresa_ids()));

-- Busca o vínculo aprendido para um texto de documento
create or replace function buscar_insumo_aprendido(
  p_empresa_id uuid, p_texto text
)
returns uuid
language sql
stable
as $$
  select insumo_id from aprendizado_insumos
  where empresa_id = p_empresa_id
    and texto_documento = upper(trim(p_texto))
  limit 1;
$$;

-- Registra ou reforça um vínculo ensinado pelo cliente
create or replace function ensinar_vinculo_insumo(
  p_empresa_id uuid, p_texto text, p_insumo_id uuid
)
returns void
language plpgsql
security definer
as $$
begin
  insert into aprendizado_insumos (empresa_id, texto_documento, insumo_id)
  values (p_empresa_id, upper(trim(p_texto)), p_insumo_id)
  on conflict (empresa_id, texto_documento)
  do update set
    insumo_id = excluded.insumo_id,
    vezes_confirmado = aprendizado_insumos.vezes_confirmado + 1,
    updated_at = now();
end;
$$;
