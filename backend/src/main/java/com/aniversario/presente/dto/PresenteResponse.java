package com.aniversario.presente.dto;

import java.math.BigDecimal;

import com.aniversario.presente.model.PresenteTipo;

public record PresenteResponse(
        Long id,
        String nome,
        String descricao,
        String imagemUrl,
        String link,
        PresenteTipo tipo,
        BigDecimal preco,
        Boolean ativo,
        Boolean reservado
) {
}
