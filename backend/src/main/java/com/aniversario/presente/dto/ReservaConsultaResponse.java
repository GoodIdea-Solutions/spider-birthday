package com.aniversario.presente.dto;

import java.time.Instant;
import java.util.UUID;

public record ReservaConsultaResponse(
        UUID token,
        Long presenteId,
        String presenteNome,
        String presenteDescricao,
        String presenteImagemUrl,
        String presenteLink,
        String nomeConvidado,
        String telefone,
        Instant createdAt
) {
}
