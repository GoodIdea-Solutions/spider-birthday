package com.aniversario.presente.service;

import java.util.UUID;

import com.aniversario.exception.ApiException;
import com.aniversario.presente.dto.ReservaConsultaResponse;
import com.aniversario.presente.dto.ReservaRequest;
import com.aniversario.presente.dto.ReservaResponse;
import com.aniversario.presente.model.Presente;
import com.aniversario.presente.model.ReservaPresente;
import com.aniversario.presente.repository.PresenteRepository;
import com.aniversario.presente.repository.ReservaPresenteRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ReservaPresenteService {

    public static final String PRESENTE_JA_RESERVADO = "Este presente já foi escolhido por outro herói!";
    private static final String PRESENTE_NAO_ENCONTRADO = "Presente não encontrado.";
    private static final String RESERVA_NAO_ENCONTRADA = "Reserva não encontrada.";

    private final PresenteRepository presenteRepository;
    private final ReservaPresenteRepository reservaPresenteRepository;

    public ReservaPresenteService(
            PresenteRepository presenteRepository,
            ReservaPresenteRepository reservaPresenteRepository
    ) {
        this.presenteRepository = presenteRepository;
        this.reservaPresenteRepository = reservaPresenteRepository;
    }

    @Transactional
    public ReservaResponse reservar(Long presenteId, ReservaRequest request) {
        try {
            Presente presente = presenteRepository.findByIdForUpdate(presenteId)
                    .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, PRESENTE_NAO_ENCONTRADO));
            if (!Boolean.TRUE.equals(presente.getAtivo())) {
                throw new ApiException(HttpStatus.NOT_FOUND, PRESENTE_NAO_ENCONTRADO);
            }
            if (reservaPresenteRepository.existsByPresenteId(presenteId)) {
                throw jaReservado();
            }

            ReservaPresente reserva = new ReservaPresente();
            reserva.setPresente(presente);
            reserva.setNomeConvidado(request.nomeConvidado().trim());
            reserva.setTelefone(trimToNull(request.telefone()));
            reserva.setToken(UUID.randomUUID());
            reservaPresenteRepository.saveAndFlush(reserva);
            return toResponse(reserva);
        } catch (DataIntegrityViolationException ex) {
            throw jaReservado();
        }
    }

    @Transactional(readOnly = true)
    public ReservaConsultaResponse consultar(String tokenRaw) {
        UUID token;
        try {
            token = UUID.fromString(tokenRaw);
        } catch (IllegalArgumentException ex) {
            throw new ApiException(HttpStatus.NOT_FOUND, RESERVA_NAO_ENCONTRADA);
        }
        ReservaPresente reserva = reservaPresenteRepository.findByToken(token)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, RESERVA_NAO_ENCONTRADA));
        Presente presente = reserva.getPresente();
        return new ReservaConsultaResponse(
                reserva.getToken(),
                presente.getId(),
                presente.getNome(),
                presente.getDescricao(),
                presente.getImagemUrl(),
                presente.getLink(),
                reserva.getNomeConvidado(),
                reserva.getTelefone(),
                reserva.getCreatedAt()
        );
    }

    @Transactional
    public void cancelar(Long id) {
        ReservaPresente reserva = reservaPresenteRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, RESERVA_NAO_ENCONTRADA));
        reservaPresenteRepository.delete(reserva);
    }

    private ReservaResponse toResponse(ReservaPresente reserva) {
        Presente presente = reserva.getPresente();
        return new ReservaResponse(
                reserva.getToken(),
                presente.getId(),
                presente.getNome(),
                reserva.getNomeConvidado(),
                reserva.getCreatedAt()
        );
    }

    private static ApiException jaReservado() {
        return new ApiException(HttpStatus.CONFLICT, PRESENTE_JA_RESERVADO);
    }

    private static String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
