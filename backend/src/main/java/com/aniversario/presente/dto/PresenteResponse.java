package com.aniversario.presente.dto;

public record PresenteResponse(
        Long id,
        String nome,
        String descricao,
        String imagemUrl,
        String link,
        Boolean ativo
) {
}
