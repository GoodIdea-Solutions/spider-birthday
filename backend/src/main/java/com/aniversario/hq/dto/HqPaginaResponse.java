package com.aniversario.hq.dto;

import java.util.List;

import com.aniversario.hq.model.HqLayout;

public record HqPaginaResponse(
        Long id,
        int ordem,
        HqLayout layout,
        String titulo,
        List<HqPainelResponse> paineis
) {
}
