ALTER TABLE fotos
    ADD COLUMN IF NOT EXISTS tipo VARCHAR(20) NOT NULL DEFAULT 'MURAL',
    ADD COLUMN IF NOT EXISTS mime_type VARCHAR(80),
    ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

UPDATE fotos SET mime_type = 'image/jpeg' WHERE mime_type IS NULL;

CREATE INDEX IF NOT EXISTS idx_fotos_tipo ON fotos (tipo);
CREATE INDEX IF NOT EXISTS idx_fotos_expires_at ON fotos (expires_at);
