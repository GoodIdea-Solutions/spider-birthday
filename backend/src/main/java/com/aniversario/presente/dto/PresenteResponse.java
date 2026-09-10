package com.aniversario.presente.dto;

import java.math.BigDecimal;

public record PresenteResponse(
        Long id,
        String nome,
        String descricao,
        String imagemUrl,
        String link,
        BigDecimal preco,
        Boolean ativo,
        Boolean reservado
) {
}
