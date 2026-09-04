package com.aniversario.foto.service;

import java.nio.file.Path;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Locale;

import com.aniversario.convidado.repository.ConvidadoRepository;
import com.aniversario.exception.ApiException;
import com.aniversario.foto.dto.DashboardResponse;
import com.aniversario.foto.dto.FotoResponse;
import com.aniversario.foto.model.Foto;
import com.aniversario.foto.model.FotoTipo;
import com.aniversario.foto.repository.FotoRepository;
import com.aniversario.foto.storage.FileStorageService;
import com.aniversario.foto.storage.StoredFile;
import com.aniversario.hq.repository.HqPainelRepository;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class FotoService {

    private static final Duration STORY_TTL = Duration.ofDays(7);

    private final FotoRepository fotoRepository;
    private final FileStorageService fileStorageService;
    private final SimpMessagingTemplate messagingTemplate;
    private final ConvidadoRepository convidadoRepository;
    private final HqPainelRepository hqPainelRepository;

    public FotoService(
            FotoRepository fotoRepository,
            FileStorageService fileStorageService,
            SimpMessagingTemplate messagingTemplate,
            ConvidadoRepository convidadoRepository,
            HqPainelRepository hqPainelRepository
    ) {
        this.fotoRepository = fotoRepository;
        this.fileStorageService = fileStorageService;
        this.messagingTemplate = messagingTemplate;
        this.convidadoRepository = convidadoRepository;
        this.hqPainelRepository = hqPainelRepository;
    }

    @Transactional
    public FotoResponse upload(MultipartFile file, FotoTipo tipo) {
        StoredFile stored = fileStorageService.store(file);
        Foto foto = new Foto();
        foto.setNomeArquivo(stored.fileName());
        foto.setUrl(stored.url());
        foto.setAprovada(false);
        foto.setTipo(tipo == null ? FotoTipo.MURAL : tipo);
        foto.setMimeType(file.getContentType() == null ? "application/octet-stream" : file.getContentType().toLowerCase(Locale.ROOT));
        return toResponse(fotoRepository.save(foto));
    }

    @Transactional(readOnly = true)
    public List<FotoResponse> listarMural() {
        return fotoRepository.findByAprovadaTrueAndTipoOrderByCreatedAtDesc(FotoTipo.MURAL).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<FotoResponse> listarStoriesAtivos() {
        return fotoRepository
                .findByAprovadaTrueAndTipoAndExpiresAtAfterOrderByCreatedAtDesc(FotoTipo.STORY, Instant.now())
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<FotoResponse> listarImagensAprovadasMural() {
        return fotoRepository
                .findByAprovadaTrueAndTipoAndMimeTypeStartingWithOrderByCreatedAtDesc(FotoTipo.MURAL, "image/")
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<FotoResponse> listarPendentes() {
        return fotoRepository.findByAprovadaFalseOrderByCreatedAtDesc().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<FotoResponse> listarTodasAdmin() {
        return fotoRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public FotoResponse aprovar(Long id) {
        Foto foto = findOrThrow(id);
        if (Boolean.TRUE.equals(foto.getAprovada())) {
            return toResponse(foto);
        }
        foto.setAprovada(true);
        if (foto.getTipo() == FotoTipo.STORY) {
            foto.setExpiresAt(Instant.now().plus(STORY_TTL));
        }
        FotoResponse response = toResponse(fotoRepository.save(foto));
        messagingTemplate.convertAndSend("/topic/fotos", response);
        return response;
    }

    @Transactional
    public void excluir(Long id) {
        Foto foto = findOrThrow(id);
        if (hqPainelRepository.existsByFotoId(id)) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "Esta foto está na revista HQ. Remova a página antes de excluir."
            );
        }
        fotoRepository.delete(foto);
        fileStorageService.delete(foto.getNomeArquivo());
    }

    @Transactional(readOnly = true)
    public Path arquivoParaDownload(Long id) {
        Foto foto = findOrThrow(id);
        return fileStorageService.resolve(foto.getNomeArquivo());
    }

    @Transactional(readOnly = true)
    public Foto findOrThrow(Long id) {
        return fotoRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Foto não encontrada."));
    }

    @Transactional(readOnly = true)
    public DashboardResponse dashboard() {
        return new DashboardResponse(
                convidadoRepository.count(),
                convidadoRepository.sumAdultos(),
                convidadoRepository.sumCriancas(),
                fotoRepository.countByAprovadaFalse(),
                fotoRepository.countByAprovadaTrue()
        );
    }

    private FotoResponse toResponse(Foto foto) {
        String mime = foto.getMimeType() == null ? "" : foto.getMimeType();
        return new FotoResponse(
                foto.getId(),
                foto.getNomeArquivo(),
                foto.getUrl(),
                foto.getAprovada(),
                foto.getCreatedAt(),
                foto.getTipo(),
                foto.getMimeType(),
                foto.getExpiresAt(),
                mime.startsWith("video/")
        );
    }
}
