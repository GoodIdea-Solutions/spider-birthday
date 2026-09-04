package com.aniversario.hq.dto;

import java.util.List;

import com.aniversario.hq.model.HqLayout;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record HqPaginaRequest(
        @NotNull
        @Min(0)
        Integer ordem,

        @NotNull
        HqLayout layout,

        @Size(max = 120)
        String titulo,

        @NotEmpty(message = "Informe ao menos um painel")
        @Valid
        List<HqPainelRequest> paineis
) {
}
