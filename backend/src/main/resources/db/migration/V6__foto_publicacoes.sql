ALTER TABLE fotos
    ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'PENDENTE',
    ADD COLUMN IF NOT EXISTS destinos_solicitados VARCHAR(20) NOT NULL DEFAULT 'MURAL',
    ADD COLUMN IF NOT EXISTS filtro VARCHAR(80);

UPDATE fotos
SET status = CASE WHEN aprovada THEN 'APROVADA' ELSE 'PENDENTE' END
WHERE status = 'PENDENTE' OR status IS NULL;

UPDATE fotos
SET destinos_solicitados = CASE WHEN tipo = 'STORY' THEN 'STORY' ELSE 'MURAL' END;

CREATE INDEX IF NOT EXISTS idx_fotos_status ON fotos (status);
CREATE INDEX IF NOT EXISTS idx_fotos_destinos_solicitados ON fotos (destinos_solicitados);

CREATE TABLE IF NOT EXISTS foto_publicacoes (
    id              BIGSERIAL PRIMARY KEY,
    foto_id         BIGINT NOT NULL REFERENCES fotos (id) ON DELETE CASCADE,
    destino         VARCHAR(20) NOT NULL,
    publicado_em    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at      TIMESTAMPTZ,
    status          VARCHAR(20) NOT NULL DEFAULT 'ATIVO',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_foto_publicacao_destino UNIQUE (foto_id, destino)
);

CREATE INDEX IF NOT EXISTS idx_foto_publicacoes_destino ON foto_publicacoes (destino);
CREATE INDEX IF NOT EXISTS idx_foto_publicacoes_expires_at ON foto_publicacoes (expires_at);

INSERT INTO foto_publicacoes (foto_id, destino, publicado_em, expires_at, status, created_at, updated_at)
SELECT f.id,
       f.tipo,
       COALESCE(f.created_at, NOW()),
       f.expires_at,
       'ATIVO',
       NOW(),
       NOW()
FROM fotos f
WHERE f.aprovada = TRUE
  AND NOT EXISTS (
      SELECT 1 FROM foto_publicacoes p WHERE p.foto_id = f.id AND p.destino = f.tipo
  );
