package com.aniversario.presente.dto;

public record PresenteAdminResponse(
        Long id,
        String nome,
        String descricao,
        String imagemUrl,
        String link,
        Boolean ativo,
        Boolean reservado,
        ReservaAdminResponse reserva
) {
}
