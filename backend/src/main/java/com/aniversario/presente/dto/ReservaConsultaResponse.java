package com.aniversario.presente.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record ReservaConsultaResponse(
        UUID token,
        Long presenteId,
        String presenteNome,
        String presenteDescricao,
        String presenteImagemUrl,
        String presenteLink,
        BigDecimal presentePreco,
        String nomeConvidado,
        String telefone,
        Instant createdAt
) {
}
