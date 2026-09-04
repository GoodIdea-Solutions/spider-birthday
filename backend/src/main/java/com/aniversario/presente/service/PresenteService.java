package com.aniversario.presente.service;

import java.util.List;

import com.aniversario.presente.dto.PresenteResponse;
import com.aniversario.presente.model.Presente;
import com.aniversario.presente.repository.PresenteRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PresenteService {

    private final PresenteRepository presenteRepository;

    public PresenteService(PresenteRepository presenteRepository) {
        this.presenteRepository = presenteRepository;
    }

    @Transactional(readOnly = true)
    public List<PresenteResponse> listarAtivos() {
        return presenteRepository.findByAtivoTrueOrderByNomeAsc().stream()
                .map(this::toResponse)
                .toList();
    }

    private PresenteResponse toResponse(Presente presente) {
        return new PresenteResponse(
                presente.getId(),
                presente.getNome(),
                presente.getDescricao(),
                presente.getImagemUrl(),
                presente.getLink(),
                presente.getAtivo()
        );
    }
}
