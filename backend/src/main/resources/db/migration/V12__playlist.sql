CREATE TABLE playlist_musicas (
    id                BIGSERIAL PRIMARY KEY,
    titulo            VARCHAR(150) NOT NULL,
    artista           VARCHAR(120),
    youtube_url       VARCHAR(2000) NOT NULL,
    youtube_video_id  VARCHAR(11) NOT NULL,
    ordem             INTEGER NOT NULL DEFAULT 0,
    ativo             BOOLEAN NOT NULL DEFAULT TRUE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_playlist_musicas_publico ON playlist_musicas (ativo, ordem, id);
