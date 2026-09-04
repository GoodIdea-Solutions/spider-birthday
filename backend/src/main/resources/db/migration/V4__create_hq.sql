CREATE TABLE hq_paginas (
    id          BIGSERIAL PRIMARY KEY,
    ordem       INTEGER NOT NULL DEFAULT 0,
    layout      VARCHAR(20) NOT NULL,
    titulo      VARCHAR(120),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_hq_paginas_ordem ON hq_paginas (ordem);

CREATE TABLE hq_paineis (
    id          BIGSERIAL PRIMARY KEY,
    pagina_id   BIGINT NOT NULL REFERENCES hq_paginas (id) ON DELETE CASCADE,
    foto_id     BIGINT NOT NULL REFERENCES fotos (id) ON DELETE RESTRICT,
    ordem       INTEGER NOT NULL DEFAULT 0,
    posicao     INTEGER NOT NULL DEFAULT 1,
    legenda     VARCHAR(280),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_hq_paineis_pagina ON hq_paineis (pagina_id);
CREATE INDEX idx_hq_paineis_foto ON hq_paineis (foto_id);
