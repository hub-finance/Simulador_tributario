-- =====================================================================
-- Simulador de Transição Tributária — schema relacional de destino
--
-- A aplicação atual persiste no navegador (localStorage). Este schema é o
-- alvo para quando houver backend: os tipos aqui espelham as interfaces de
-- `src/app/tipos.ts` e `src/dominio/`.
--
-- Dialeto: PostgreSQL.
-- =====================================================================

CREATE TABLE clientes (
    id                        UUID PRIMARY KEY,
    nome                      VARCHAR(255) NOT NULL,
    cnpj                      VARCHAR(18) UNIQUE NOT NULL,
    cnae                      VARCHAR(10),
    anexo                     SMALLINT CHECK (anexo BETWEEN 1 AND 5),
    perfil                    VARCHAR(5) NOT NULL CHECK (perfil IN ('B2B', 'B2C', 'MISTO')),
    -- Fração da receita vendida a PJ (0 a 1). É o peso do crédito na decisão.
    percentual_receita_b2b    NUMERIC(4, 3) NOT NULL DEFAULT 0
                              CHECK (percentual_receita_b2b BETWEEN 0 AND 1),
    sujeito_ao_fator_r        BOOLEAN NOT NULL DEFAULT FALSE,
    criado_em                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Situação cadastral: débito ou pendência barra a opção na janela de setembro.
CREATE TABLE situacao_cadastral (
    id_cliente                    UUID PRIMARY KEY REFERENCES clientes(id) ON DELETE CASCADE,
    possui_debitos_em_aberto      BOOLEAN NOT NULL DEFAULT FALSE,
    valor_debitos                 NUMERIC(15, 2) NOT NULL DEFAULT 0,
    possui_pendencias_cadastrais  BOOLEAN NOT NULL DEFAULT FALSE,
    verificado_em                 TIMESTAMPTZ,
    observacao                    TEXT
);

-- Grupo econômico: base do cruzamento de faturamento global entre CNPJs
-- com sócios em comum, que passou a rodar automaticamente na malha fina.
CREATE TABLE cnpjs_interligados (
    id                UUID PRIMARY KEY,
    id_cliente        UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
    cnpj              VARCHAR(18) NOT NULL,
    nome              VARCHAR(255) NOT NULL,
    rbt12             NUMERIC(15, 2) NOT NULL DEFAULT 0,
    UNIQUE (id_cliente, cnpj)
);

-- Dados financeiros mensais (importados do sistema contábil).
CREATE TABLE dados_financeiros (
    id                        UUID PRIMARY KEY,
    id_cliente                UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
    mes_referencia            DATE NOT NULL,
    rbt12                     NUMERIC(15, 2) NOT NULL,
    faturamento_mes           NUMERIC(15, 2) NOT NULL,
    anexo_apurado             SMALLINT CHECK (anexo_apurado BETWEEN 1 AND 5),
    volume_compras_insumos    NUMERIC(15, 2) NOT NULL DEFAULT 0,
    folha_pagamento_12m       NUMERIC(15, 2) NOT NULL DEFAULT 0,
    saldo_credor_ibs_cbs      NUMERIC(15, 2) NOT NULL DEFAULT 0,
    ibs_acumulado_12m         NUMERIC(15, 2) NOT NULL DEFAULT 0,
    UNIQUE (id_cliente, mes_referencia)
);

-- Composição da receita bruta: as parcelas atípicas que a RFB definiu
-- como integrantes (gorjetas, juros, multas de mora, entrega futura) e as
-- deduções que não integram.
CREATE TABLE composicao_receita (
    id_dado_financeiro            UUID PRIMARY KEY REFERENCES dados_financeiros(id) ON DELETE CASCADE,
    vendas_e_servicos             NUMERIC(15, 2) NOT NULL DEFAULT 0,
    gorjetas                      NUMERIC(15, 2) NOT NULL DEFAULT 0,
    juros_recebidos               NUMERIC(15, 2) NOT NULL DEFAULT 0,
    multas_mora_recebidas         NUMERIC(15, 2) NOT NULL DEFAULT 0,
    operacoes_entrega_futura      NUMERIC(15, 2) NOT NULL DEFAULT 0,
    vendas_canceladas             NUMERIC(15, 2) NOT NULL DEFAULT 0,
    descontos_incondicionais      NUMERIC(15, 2) NOT NULL DEFAULT 0,
    ipi_destacado                 NUMERIC(15, 2) NOT NULL DEFAULT 0,
    icms_substituicao_tributaria  NUMERIC(15, 2) NOT NULL DEFAULT 0
);

-- Tabelas dos Anexos I a V. Atualizadas a cada revalidação anual.
CREATE TABLE parametros_anexos (
    anexo               SMALLINT NOT NULL CHECK (anexo BETWEEN 1 AND 5),
    faixa               SMALLINT NOT NULL CHECK (faixa BETWEEN 1 AND 6),
    receita_ate         NUMERIC(15, 2) NOT NULL,
    aliquota_nominal    NUMERIC(6, 5) NOT NULL,
    parcela_deduzir     NUMERIC(15, 2) NOT NULL,
    -- Repartição por tributo. A soma das seis colunas deve fechar em 1.
    pct_irpj            NUMERIC(6, 5) NOT NULL DEFAULT 0,
    pct_csll            NUMERIC(6, 5) NOT NULL DEFAULT 0,
    pct_cofins          NUMERIC(6, 5) NOT NULL DEFAULT 0,
    pct_pis             NUMERIC(6, 5) NOT NULL DEFAULT 0,
    pct_cpp             NUMERIC(6, 5) NOT NULL DEFAULT 0,
    pct_ipi             NUMERIC(6, 5) NOT NULL DEFAULT 0,
    pct_icms            NUMERIC(6, 5) NOT NULL DEFAULT 0,
    pct_iss             NUMERIC(6, 5) NOT NULL DEFAULT 0,
    vigencia_inicio     DATE NOT NULL,
    vigencia_fim        DATE,
    PRIMARY KEY (anexo, faixa, vigencia_inicio),
    CONSTRAINT reparticao_fecha_em_cem CHECK (
        ABS(pct_irpj + pct_csll + pct_cofins + pct_pis + pct_cpp + pct_ipi + pct_icms + pct_iss - 1) < 0.0001
    )
);

-- Cronograma da reforma: um registro por ano de 2026 a 2033.
CREATE TABLE parametros_reforma (
    ano_vigencia                    SMALLINT PRIMARY KEY,
    aliquota_cbs                    NUMERIC(6, 5) NOT NULL,
    aliquota_ibs                    NUMERIC(6, 5) NOT NULL,
    fracao_pis_cofins               NUMERIC(4, 3) NOT NULL CHECK (fracao_pis_cofins BETWEEN 0 AND 1),
    fracao_icms_iss                 NUMERIC(4, 3) NOT NULL CHECK (fracao_icms_iss BETWEEN 0 AND 1),
    fracao_ipi                      NUMERIC(4, 3) NOT NULL CHECK (fracao_ipi BETWEEN 0 AND 1),
    simples_dispensado_recolhimento BOOLEAN NOT NULL DEFAULT FALSE,
    opcao_hibrida_disponivel        BOOLEAN NOT NULL DEFAULT FALSE,
    observacao                      TEXT
);

-- Histórico de simulações: prova do que foi calculado, quando e com quais números.
CREATE TABLE simulacoes (
    id                          UUID PRIMARY KEY,
    id_cliente                  UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
    ano_simulado                SMALLINT NOT NULL REFERENCES parametros_reforma(ano_vigencia),
    executada_em                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Entradas congeladas no momento da simulação.
    rbt12                       NUMERIC(15, 2) NOT NULL,
    faturamento_mes             NUMERIC(15, 2) NOT NULL,
    insumos                     NUMERIC(15, 2) NOT NULL,
    anexo                       SMALLINT NOT NULL,
    percentual_receita_b2b      NUMERIC(4, 3) NOT NULL,
    -- Resultados.
    aliquota_efetiva_simples    NUMERIC(6, 5) NOT NULL,
    custo_tradicional           NUMERIC(15, 2) NOT NULL,
    credito_tradicional         NUMERIC(15, 2) NOT NULL,
    custo_hibrido               NUMERIC(15, 2) NOT NULL,
    das_reduzido                NUMERIC(15, 2) NOT NULL,
    guia_ibs_cbs                NUMERIC(15, 2) NOT NULL,
    credito_hibrido             NUMERIC(15, 2) NOT NULL,
    saldo_credor_acumulado      NUMERIC(15, 2) NOT NULL DEFAULT 0,
    vantagem_ponderada          NUMERIC(15, 2) NOT NULL,
    cenario_recomendado         VARCHAR(12) NOT NULL CHECK (cenario_recomendado IN ('Tradicional', 'Híbrido')),
    confianca                   VARCHAR(6) NOT NULL CHECK (confianca IN ('alta', 'media', 'baixa'))
);

CREATE INDEX idx_simulacoes_cliente_ano ON simulacoes (id_cliente, ano_simulado, executada_em DESC);

-- Alertas gerados por simulação (risco comercial, bloqueio cadastral, sublimite…).
CREATE TABLE alertas_simulacao (
    id              UUID PRIMARY KEY,
    id_simulacao    UUID NOT NULL REFERENCES simulacoes(id) ON DELETE CASCADE,
    severidade      VARCHAR(12) NOT NULL CHECK (severidade IN ('bloqueio', 'risco', 'atencao', 'informacao')),
    titulo          VARCHAR(255) NOT NULL,
    detalhe         TEXT NOT NULL,
    origem          VARCHAR(120) NOT NULL
);

-- Decisão formalizada. É a prova de que a orientação foi dada e aceita.
CREATE TABLE decisoes (
    id                  UUID PRIMARY KEY,
    id_cliente          UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
    id_simulacao        UUID REFERENCES simulacoes(id) ON DELETE SET NULL,
    cenario             VARCHAR(12) NOT NULL CHECK (cenario IN ('Tradicional', 'Híbrido')),
    janela              VARCHAR(20) NOT NULL CHECK (janela IN ('Setembro/2026', 'Março/2027')),
    registrada_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    responsavel         VARCHAR(120),
    observacao          TEXT,
    -- Datas de controle do ciclo da janela.
    formalizada_em      TIMESTAMPTZ,
    cancelada_em        TIMESTAMPTZ,
    -- Após 30/11/2026 a opção de setembro se torna irretratável.
    irretratavel_a_partir_de DATE
);

CREATE INDEX idx_decisoes_cliente ON decisoes (id_cliente, registrada_em DESC);

-- Eventos do calendário da transição (janelas, prazos, obrigações).
CREATE TABLE eventos_calendario (
    id              VARCHAR(60) PRIMARY KEY,
    titulo          VARCHAR(255) NOT NULL,
    categoria       VARCHAR(30) NOT NULL CHECK (categoria IN (
                        'janela-opcao', 'prazo-irretratavel', 'obrigacao-acessoria',
                        'marco-operacional', 'preparacao-escritorio')),
    criticidade     VARCHAR(8) NOT NULL CHECK (criticidade IN ('critica', 'alta', 'media')),
    data_inicio     DATE NOT NULL,
    data_fim        DATE NOT NULL,
    descricao       TEXT NOT NULL,
    consequencia    TEXT NOT NULL,
    responsavel     VARCHAR(30) NOT NULL,
    efeito_sobre    VARCHAR(60),
    CONSTRAINT periodo_valido CHECK (data_fim >= data_inicio)
);

-- Controle de entrega das obrigações acessórias e cálculo de multa por atraso.
CREATE TABLE obrigacoes_entregues (
    id                  UUID PRIMARY KEY,
    id_cliente          UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
    tipo                VARCHAR(10) NOT NULL CHECK (tipo IN ('PGDAS-D', 'DEFIS')),
    competencia         DATE NOT NULL,
    vencimento          DATE NOT NULL,
    entregue_em         DATE,
    base_tributos       NUMERIC(15, 2) NOT NULL DEFAULT 0,
    multa_calculada     NUMERIC(15, 2) NOT NULL DEFAULT 0,
    UNIQUE (id_cliente, tipo, competencia)
);
