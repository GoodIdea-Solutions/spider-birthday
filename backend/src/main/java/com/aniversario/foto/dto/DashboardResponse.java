package com.aniversario.foto.dto;

public record DashboardResponse(
        long totalRsvps,
        long totalAdultos,
        long totalCriancas,
        long fotosPendentes,
        long fotosAprovadas,
        long storiesAtivos,
        long muralCount
) {
}
