package com.aniversario.convidado.service;

import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

import com.aniversario.convidado.dto.RsvpConfigResponse;
import com.aniversario.convidado.dto.RsvpConfigUpdateRequest;
import com.aniversario.convidado.model.RsvpConfig;
import com.aniversario.convidado.repository.RsvpConfigRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RsvpConfigService {

    public static final ZoneId ZONE = ZoneId.of("America/Sao_Paulo");
    private static final DateTimeFormatter PRAZO_BR = DateTimeFormatter.ofPattern("dd/MM/yyyy", Locale.forLanguageTag("pt-BR"));

    private final RsvpConfigRepository rsvpConfigRepository;

    public RsvpConfigService(RsvpConfigRepository rsvpConfigRepository) {
        this.rsvpConfigRepository = rsvpConfigRepository;
    }

    @Transactional(readOnly = true)
    public RsvpConfigResponse obter() {
        return toResponse(getOrCreate());
    }

    @Transactional
    public RsvpConfigResponse atualizar(RsvpConfigUpdateRequest request) {
        RsvpConfig config = getOrCreate();
        config.setConfirmacaoLiberada(request.confirmacaoLiberada());
        config.setPrazoConfirmacao(request.prazoConfirmacao());
        return toResponse(rsvpConfigRepository.save(config));
    }

    @Transactional(readOnly = true)
    public boolean isAberta() {
        return isAberta(getOrCreate());
    }

    @Transactional(readOnly = true)
    public String mensagemEncerrada() {
        RsvpConfig config = getOrCreate();
        if (Boolean.TRUE.equals(config.getConfirmacaoLiberada())) {
            LocalDate prazo = config.getPrazoConfirmacao();
            if (prazo != null && hoje().isAfter(prazo)) {
                return "O prazo para confirmar presença encerrou em " + prazo.format(PRAZO_BR) + ".";
            }
        }
        return "As confirmações estão encerradas.";
    }

    private RsvpConfig getOrCreate() {
        return rsvpConfigRepository.findById(RsvpConfig.SINGLETON_ID).orElseGet(() -> {
            RsvpConfig created = new RsvpConfig();
            created.setId(RsvpConfig.SINGLETON_ID);
            created.setConfirmacaoLiberada(true);
            return created;
        });
    }

    private RsvpConfigResponse toResponse(RsvpConfig config) {
        return new RsvpConfigResponse(
                Boolean.TRUE.equals(config.getConfirmacaoLiberada()),
                config.getPrazoConfirmacao(),
                isAberta(config)
        );
    }

    private boolean isAberta(RsvpConfig config) {
        if (!Boolean.TRUE.equals(config.getConfirmacaoLiberada())) {
            return false;
        }
        LocalDate prazo = config.getPrazoConfirmacao();
        return prazo == null || !hoje().isAfter(prazo);
    }

    private static LocalDate hoje() {
        return LocalDate.now(ZONE);
    }
}
