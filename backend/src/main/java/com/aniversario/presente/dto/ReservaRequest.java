package com.aniversario.presente.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ReservaRequest(
        @NotBlank(message = "Nome é obrigatório")
        @Size(max = 120, message = "Nome deve ter no máximo 120 caracteres")
        String nomeConvidado,

        @Size(max = 30, message = "Telefone deve ter no máximo 30 caracteres")
        String telefone
) {
}
