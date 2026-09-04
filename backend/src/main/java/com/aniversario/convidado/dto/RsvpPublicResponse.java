package com.aniversario.convidado.dto;

import java.util.List;

public record RsvpPublicResponse(
        String nome,
        int quantidadeAdultos,
        int quantidadeCriancas,
        List<String> nomesAdultos,
        List<String> nomesCriancas
) {
}
