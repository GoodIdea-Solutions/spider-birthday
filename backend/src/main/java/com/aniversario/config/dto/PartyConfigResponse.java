package com.aniversario.config.dto;

public record PartyConfigResponse(
        String nomeCrianca,
        String slug,
        String idade,
        String dataFesta,
        String diaSemana,
        String horario,
        String local,
        String endereco,
        String linkGoogleMaps,
        String mensagemHero,
        String textoApresentacao,
        String mensagemFaixa,
        String mensagemPresenca,
        String mensagemMissao,
        String whatsappNumber,
        String emailRecepcao,
        String instagramHandle
) {
}
