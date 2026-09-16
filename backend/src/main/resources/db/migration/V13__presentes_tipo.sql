ALTER TABLE presentes
    ADD COLUMN tipo VARCHAR(20);

CREATE INDEX IF NOT EXISTS idx_presentes_tipo ON presentes (tipo);
