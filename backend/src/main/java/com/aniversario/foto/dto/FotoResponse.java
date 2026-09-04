package com.aniversario.foto.dto;

import java.time.Instant;
import java.util.List;

import com.aniversario.foto.model.FotoDestinos;
import com.aniversario.foto.model.FotoStatus;
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
        boolean video,
        FotoStatus status,
        FotoDestinos destinosSolicitados,
        List<FotoTipo> destinos
) {
}
