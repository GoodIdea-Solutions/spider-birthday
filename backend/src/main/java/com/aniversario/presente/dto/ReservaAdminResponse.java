package com.aniversario.presente.dto;

import java.time.Instant;

public record ReservaAdminResponse(
        Long id,
        String nomeConvidado,
        String telefone,
        Instant createdAt
) {
}
