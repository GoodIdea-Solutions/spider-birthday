-- V10: reserva exclusiva de presentes (um presente, uma reserva)
CREATE TABLE reservas_presente (
    id              BIGSERIAL PRIMARY KEY,
    presente_id     BIGINT NOT NULL UNIQUE REFERENCES presentes (id) ON DELETE CASCADE,
    nome_convidado  VARCHAR(120) NOT NULL,
    telefone        VARCHAR(30),
    token           UUID NOT NULL UNIQUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reservas_presente_token ON reservas_presente (token);
