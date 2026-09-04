package com.aniversario.hq.dto;

public record HqPainelResponse(
        Long id,
        Long fotoId,
        String fotoUrl,
        int posicao,
        String legenda
) {
}
