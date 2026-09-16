package com.aniversario.presente.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ProdutoLinkPreviewRequest(
        @NotBlank(message = "Informe o link da loja.")
        @Size(max = 2000, message = "Link da loja deve ter no máximo 2000 caracteres.")
        String url
) {
}
