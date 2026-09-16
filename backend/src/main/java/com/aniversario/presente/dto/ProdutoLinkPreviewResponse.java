package com.aniversario.presente.dto;

import java.util.List;

public record ProdutoLinkPreviewResponse(
        String titulo,
        String descricao,
        String preco,
        String imagemUrl,
        List<String> encontrados
) {
}
