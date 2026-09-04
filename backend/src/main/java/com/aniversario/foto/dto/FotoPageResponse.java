package com.aniversario.foto.dto;

import java.util.List;

public record FotoPageResponse(
        List<FotoResponse> items,
        int page,
        int size,
        long total,
        boolean hasMore
) {
}
