package com.aniversario.hq.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record HqPainelRequest(
        @NotNull(message = "fotoId é obrigatório")
        Long fotoId,

        @Min(value = 1, message = "Posição mínima é 1")
        @Max(value = 3, message = "Posição máxima é 3")
        int posicao,

        @Size(max = 280, message = "Legenda deve ter no máximo 280 caracteres")
        String legenda
) {
}
