package com.aniversario.config;

import java.time.format.DateTimeFormatter;

import com.aniversario.config.dto.PartyConfigResponse;
import com.aniversario.convidado.dto.RsvpConfigResponse;
import com.aniversario.convidado.service.RsvpConfigService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/party")
public class PartyController {

    private static final DateTimeFormatter ISO_DATE = DateTimeFormatter.ISO_LOCAL_DATE;

    private final PartyProperties partyProperties;
    private final RsvpConfigService rsvpConfigService;

    public PartyController(PartyProperties partyProperties, RsvpConfigService rsvpConfigService) {
        this.partyProperties = partyProperties;
        this.rsvpConfigService = rsvpConfigService;
    }

    @GetMapping
    public PartyConfigResponse getParty() {
        RsvpConfigResponse rsvp = rsvpConfigService.obter();
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
                toCaixa18Anos(partyProperties.getCaixa18Anos()),
                rsvp.prazoConfirmacao() == null ? null : rsvp.prazoConfirmacao().format(ISO_DATE),
                rsvp.confirmacaoLiberada(),
                rsvp.confirmacaoAberta()
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
