package com.aniversario.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Getter
@Setter
@ConfigurationProperties(prefix = "party")
public class PartyProperties {
    private String nomeCrianca;
    private String slug;
    private String idade;
    private String dataFesta;
    private String diaSemana;
    private String horario;
    private String local;
    private String endereco;
    private String linkGoogleMaps;
    private String mensagemHero;
    private String textoApresentacao;
    private String mensagemFaixa;
    private String mensagemPresenca;
    private String mensagemMissao;
    private String whatsappNumber;
    private String emailRecepcao;
    private String instagramHandle;
    private Caixa18Anos caixa18Anos = new Caixa18Anos();

    @Getter
    @Setter
    public static class Caixa18Anos {
        private String titulo;
        private String texto;
        private String qrCodeUrl;
        private String pixKey;
    }
}
