package com.aniversario.config;

import com.aniversario.config.dto.PartyConfigResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/party")
public class PartyController {

    private final PartyProperties partyProperties;

    public PartyController(PartyProperties partyProperties) {
        this.partyProperties = partyProperties;
    }

    @GetMapping
    public PartyConfigResponse getParty() {
        return new PartyConfigResponse(
                partyProperties.getNomeCrianca(),
                partyProperties.getSlug(),
                partyProperties.getIdade(),
                partyProperties.getDataFesta(),
                partyProperties.getDiaSemana(),
                partyProperties.getHorario(),
                partyProperties.getLocal(),
                partyProperties.getEndereco(),
                partyProperties.getLinkGoogleMaps(),
                partyProperties.getMensagemHero(),
                partyProperties.getTextoApresentacao(),
                partyProperties.getMensagemFaixa(),
                partyProperties.getMensagemPresenca(),
                partyProperties.getMensagemMissao(),
                partyProperties.getWhatsappNumber(),
                partyProperties.getEmailRecepcao(),
                partyProperties.getInstagramHandle(),
                toCaixa18Anos(partyProperties.getCaixa18Anos())
        );
    }

    private static PartyConfigResponse.Caixa18AnosConfig toCaixa18Anos(PartyProperties.Caixa18Anos caixa) {
        if (caixa == null) {
            return new PartyConfigResponse.Caixa18AnosConfig(null, null, null, null);
        }
        return new PartyConfigResponse.Caixa18AnosConfig(
                caixa.getTitulo(),
                caixa.getTexto(),
                caixa.getQrCodeUrl(),
                caixa.getPixKey()
        );
    }
}
