-- V1: tabelas principais
CREATE TABLE convidados (
    id              BIGSERIAL PRIMARY KEY,
    nome            VARCHAR(120) NOT NULL,
    quantidade_adultos INTEGER NOT NULL DEFAULT 0,
    quantidade_criancas INTEGER NOT NULL DEFAULT 0,
    telefone        VARCHAR(30),
    confirmado      BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_convidados_created_at ON convidados (created_at DESC);
CREATE INDEX idx_convidados_nome ON convidados (nome);

CREATE TABLE presentes (
    id              BIGSERIAL PRIMARY KEY,
    nome            VARCHAR(150) NOT NULL,
    descricao       VARCHAR(500),
    imagem_url      VARCHAR(500),
    link            VARCHAR(500),
    ativo           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_presentes_ativo ON presentes (ativo);

CREATE TABLE fotos (
    id              BIGSERIAL PRIMARY KEY,
    nome_arquivo    VARCHAR(255) NOT NULL,
    url             VARCHAR(500) NOT NULL,
    aprovada        BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_fotos_aprovada ON fotos (aprovada);
CREATE INDEX idx_fotos_created_at ON fotos (created_at DESC);
