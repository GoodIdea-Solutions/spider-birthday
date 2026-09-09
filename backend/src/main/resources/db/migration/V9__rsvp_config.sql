CREATE TABLE rsvp_config (
    id                     BIGINT PRIMARY KEY,
    confirmacao_liberada   BOOLEAN NOT NULL DEFAULT TRUE,
    prazo_confirmacao      DATE,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT rsvp_config_singleton CHECK (id = 1)
);

INSERT INTO rsvp_config (id, confirmacao_liberada)
VALUES (1, TRUE);
