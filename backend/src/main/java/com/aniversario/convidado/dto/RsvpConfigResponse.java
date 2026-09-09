package com.aniversario.convidado.dto;

import java.time.LocalDate;

public record RsvpConfigResponse(
        boolean confirmacaoLiberada,
        LocalDate prazoConfirmacao,
        boolean confirmacaoAberta
) {
}
