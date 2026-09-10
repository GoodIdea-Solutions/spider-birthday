package com.aniversario.presente.dto;

import java.time.Instant;
import java.util.UUID;

public record ReservaResponse(
        UUID token,
        Long presenteId,
        String presenteNome,
        String nomeConvidado,
        Instant createdAt
) {
}
