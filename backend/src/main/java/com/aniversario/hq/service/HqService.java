package com.aniversario.hq.service;

import java.util.Comparator;
import java.util.List;

import com.aniversario.exception.ApiException;
import com.aniversario.foto.model.Foto;
import com.aniversario.foto.repository.FotoRepository;
import com.aniversario.hq.dto.HqPaginaRequest;
import com.aniversario.hq.dto.HqPaginaResponse;
import com.aniversario.hq.dto.HqPainelRequest;
import com.aniversario.hq.dto.HqPainelResponse;
import com.aniversario.hq.model.HqLayout;
import com.aniversario.hq.model.HqPagina;
import com.aniversario.hq.model.HqPainel;
import com.aniversario.hq.repository.HqPaginaRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class HqService {

    private final HqPaginaRepository paginaRepository;
    private final FotoRepository fotoRepository;

    public HqService(HqPaginaRepository paginaRepository, FotoRepository fotoRepository) {
        this.paginaRepository = paginaRepository;
        this.fotoRepository = fotoRepository;
    }

    @Transactional(readOnly = true)
    public List<HqPaginaResponse> listarPublico() {
        return paginaRepository.findAllWithPaineis().stream()
                .map(this::toPublicResponse)
                .filter(p -> !p.paineis().isEmpty())
                .toList();
    }

    @Transactional(readOnly = true)
    public List<HqPaginaResponse> listarAdmin() {
        return paginaRepository.findAllWithPaineis().stream()
                .map(this::toAdminResponse)
                .toList();
    }

    @Transactional
    public HqPaginaResponse criar(HqPaginaRequest request) {
        HqPagina pagina = new HqPagina();
        aplicar(pagina, request);
        return toAdminResponse(paginaRepository.save(pagina));
    }

    @Transactional
    public HqPaginaResponse atualizar(Long id, HqPaginaRequest request) {
        HqPagina pagina = paginaRepository.findByIdWithPaineis(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Página da HQ não encontrada."));
        aplicar(pagina, request);
        return toAdminResponse(paginaRepository.save(pagina));
    }

    @Transactional
    public void excluir(Long id) {
        HqPagina pagina = paginaRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Página da HQ não encontrada."));
        paginaRepository.delete(pagina);
    }

    private void aplicar(HqPagina pagina, HqPaginaRequest request) {
        HqLayout layout = request.layout();
        if (request.paineis().size() != layout.painelCount()) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "O layout " + layout + " exige exatamente " + layout.painelCount() + " painel(is)."
            );
        }

        pagina.setOrdem(request.ordem());
        pagina.setLayout(layout);
        pagina.setTitulo(blankToNull(request.titulo()));
        pagina.getPaineis().clear();

        int ordem = 1;
        for (HqPainelRequest item : request.paineis()) {
            Foto foto = fotoRepository.findById(item.fotoId())
                    .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Foto não encontrada."));
            if (!Boolean.TRUE.equals(foto.getAprovada())) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Só fotos aprovadas entram na revista HQ.");
            }
            String mime = foto.getMimeType() == null ? "" : foto.getMimeType();
            if (mime.startsWith("video/")) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Vídeos não entram na revista HQ. Use uma foto.");
            }

            HqPainel painel = new HqPainel();
            painel.setPagina(pagina);
            painel.setFoto(foto);
            painel.setOrdem(ordem++);
            painel.setPosicao(item.posicao());
            painel.setLegenda(blankToNull(item.legenda()));
            pagina.getPaineis().add(painel);
        }
    }

    private HqPaginaResponse toPublicResponse(HqPagina pagina) {
        List<HqPainelResponse> paineis = pagina.getPaineis().stream()
                .filter(p -> Boolean.TRUE.equals(p.getFoto().getAprovada()))
                .sorted(Comparator.comparing(HqPainel::getOrdem))
                .map(this::toPainelResponse)
                .toList();
        return new HqPaginaResponse(pagina.getId(), pagina.getOrdem(), pagina.getLayout(), pagina.getTitulo(), paineis);
    }

    private HqPaginaResponse toAdminResponse(HqPagina pagina) {
        List<HqPainelResponse> paineis = pagina.getPaineis().stream()
                .sorted(Comparator.comparing(HqPainel::getOrdem))
                .map(this::toPainelResponse)
                .toList();
        return new HqPaginaResponse(
                pagina.getId(),
                pagina.getOrdem(),
                pagina.getLayout(),
                pagina.getTitulo(),
                paineis
        );
    }

    private HqPainelResponse toPainelResponse(HqPainel painel) {
        Foto foto = painel.getFoto();
        return new HqPainelResponse(
                painel.getId(),
                foto.getId(),
                foto.getUrl(),
                painel.getPosicao(),
                painel.getLegenda()
        );
    }

    private static String blankToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}
