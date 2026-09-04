package com.aniversario.foto.dto;

import java.time.Instant;

import com.aniversario.foto.model.FotoTipo;

public record FotoResponse(
        Long id,
        String nomeArquivo,
        String url,
        Boolean aprovada,
        Instant createdAt,
        FotoTipo tipo,
        String mimeType,
        Instant expiresAt,
        boolean video
) {
}
