package com.aniversario.convidado.dto;

import java.time.Instant;
import java.util.List;

public record RsvpResponse(
        Long id,
        String nome,
        Integer quantidadeAdultos,
        Integer quantidadeCriancas,
        String telefone,
        List<String> nomesAdultos,
        List<String> nomesCriancas,
        Boolean confirmado,
        Instant createdAt
) {
}
