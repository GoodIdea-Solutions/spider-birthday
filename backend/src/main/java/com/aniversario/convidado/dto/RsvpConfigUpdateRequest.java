package com.aniversario.convidado.dto;

import java.time.LocalDate;

import jakarta.validation.constraints.NotNull;

public record RsvpConfigUpdateRequest(
        @NotNull(message = "Informe se as confirmações estão liberadas")
        Boolean confirmacaoLiberada,
        LocalDate prazoConfirmacao
) {
}
