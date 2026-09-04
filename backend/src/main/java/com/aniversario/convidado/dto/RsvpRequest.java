package com.aniversario.convidado.dto;

import java.util.List;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record RsvpRequest(
        @NotBlank(message = "Nome é obrigatório")
        @Size(max = 120, message = "Nome deve ter no máximo 120 caracteres")
        String nome,

        @NotNull(message = "Quantidade de adultos é obrigatória")
        @Min(value = 0, message = "Quantidade de adultos não pode ser negativa")
        Integer quantidadeAdultos,

        @NotNull(message = "Quantidade de crianças é obrigatória")
        @Min(value = 0, message = "Quantidade de crianças não pode ser negativa")
        Integer quantidadeCriancas,

        @Size(max = 30, message = "Telefone deve ter no máximo 30 caracteres")
        String telefone,

        /** Nomes dos adultos adicionais (além do responsável). */
        List<String> nomesAdultos,

        /** Nomes de todas as crianças. */
        List<String> nomesCriancas
) {
}
