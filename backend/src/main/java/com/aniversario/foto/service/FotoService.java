package com.aniversario.foto.service;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

import com.aniversario.convidado.repository.ConvidadoRepository;
import com.aniversario.exception.ApiException;
import com.aniversario.foto.dto.DashboardResponse;
import com.aniversario.foto.dto.FotoPageResponse;
import com.aniversario.foto.dto.FotoResponse;
import com.aniversario.foto.model.Foto;
import com.aniversario.foto.model.FotoDestinos;
import com.aniversario.foto.model.FotoPublicacao;
import com.aniversario.foto.model.FotoPublicacaoStatus;
import com.aniversario.foto.model.FotoStatus;
import com.aniversario.foto.model.FotoTipo;
import com.aniversario.foto.repository.FotoRepository;
import com.aniversario.foto.storage.FileStorageService;
import com.aniversario.foto.storage.StoredFile;
import com.aniversario.hq.repository.HqPainelRepository;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class FotoService {

    private static final Duration STORY_TTL = Duration.ofDays(7);
    private static final int DEFAULT_PAGE_SIZE = 12;

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
    public FotoResponse upload(MultipartFile file, FotoDestinos destinos, FotoTipo tipoLegado) {
        FotoDestinos resolved = destinos != null
                ? destinos
                : FotoDestinos.fromLegado(tipoLegado == null ? FotoTipo.MURAL : tipoLegado);
        StoredFile stored = fileStorageService.store(file);
        Foto foto = new Foto();
        foto.setNomeArquivo(stored.fileName());
        foto.setUrl(stored.url());
        foto.setAprovada(false);
        foto.setStatus(FotoStatus.PENDENTE);
        foto.setDestinosSolicitados(resolved);
        foto.setTipo(resolved == FotoDestinos.STORY ? FotoTipo.STORY : FotoTipo.MURAL);
        foto.setMimeType(file.getContentType() == null ? "application/octet-stream" : file.getContentType().toLowerCase(Locale.ROOT));
        return toResponse(fotoRepository.save(foto));
    }

    @Transactional(readOnly = true)
    public FotoPageResponse listarMural(int page, int size) {
        int safePage = Math.max(page, 0);
        int safeSize = size < 1 ? DEFAULT_PAGE_SIZE : Math.min(size, 48);
        Page<Foto> result = fotoRepository.findMuralPublicado(
                PageRequest.of(safePage, safeSize, Sort.by(Sort.Direction.DESC, "createdAt"))
        );
        return new FotoPageResponse(
                result.getContent().stream().map(this::toResponse).toList(),
                result.getNumber(),
                result.getSize(),
                result.getTotalElements(),
                result.hasNext()
        );
    }

    @Transactional(readOnly = true)
    public List<FotoResponse> listarStoriesAtivos() {
        return fotoRepository.findStoriesAtivos(Instant.now()).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<FotoResponse> listarImagensAprovadasMural() {
        return fotoRepository.findImagensMuralAprovadas().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<FotoResponse> listarPendentes() {
        return fotoRepository.findByStatusOrderByCreatedAtDesc(FotoStatus.PENDENTE).stream()
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
        if (foto.getStatus() == FotoStatus.REJEITADA) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Esta mídia foi rejeitada e não pode ser aprovada.");
        }
        if (foto.getStatus() != FotoStatus.APROVADA) {
            foto.setStatus(FotoStatus.APROVADA);
            foto.setAprovada(true);
        }
        criarPublicacoes(foto);
        fotoRepository.save(foto);
        FotoResponse response = toResponse(foto);
        messagingTemplate.convertAndSend("/topic/fotos", response);
        return response;
    }

    @Transactional
    public FotoResponse rejeitar(Long id) {
        Foto foto = findOrThrow(id);
        if (foto.getStatus() == FotoStatus.APROVADA) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Mídia já aprovada. Exclua se quiser removê-la.");
        }
        foto.setStatus(FotoStatus.REJEITADA);
        foto.setAprovada(false);
        return toResponse(fotoRepository.save(foto));
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
    public Resource arquivoParaDownload(Long id) {
        Foto foto = findOrThrow(id);
        return fileStorageService.open(foto.getNomeArquivo(), foto.getUrl());
    }

    @Transactional(readOnly = true)
    public Foto findOrThrow(Long id) {
        return fotoRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Foto não encontrada."));
    }

    @Transactional(readOnly = true)
    public DashboardResponse dashboard() {
        Instant now = Instant.now();
        return new DashboardResponse(
                convidadoRepository.count(),
                convidadoRepository.sumAdultos(),
                convidadoRepository.sumCriancas(),
                fotoRepository.countByStatus(FotoStatus.PENDENTE),
                fotoRepository.countByStatus(FotoStatus.APROVADA),
                fotoRepository.countStoriesAtivos(now),
                fotoRepository.countMuralPublicado()
        );
    }

    private void criarPublicacoes(Foto foto) {
        Instant now = Instant.now();
        FotoDestinos destinos = foto.getDestinosSolicitados() == null
                ? FotoDestinos.MURAL
                : foto.getDestinosSolicitados();

        if (destinos.incluiMural()) {
            garantirPublicacao(foto, FotoTipo.MURAL, now, null);
        }
        if (destinos.incluiStory()) {
            Instant expiresAt = now.plus(STORY_TTL);
            garantirPublicacao(foto, FotoTipo.STORY, now, expiresAt);
            foto.setExpiresAt(expiresAt);
        }
        foto.setTipo(destinos == FotoDestinos.STORY ? FotoTipo.STORY : FotoTipo.MURAL);
    }

    private void garantirPublicacao(Foto foto, FotoTipo destino, Instant publicadoEm, Instant expiresAt) {
        boolean exists = foto.getPublicacoes().stream().anyMatch(p -> p.getDestino() == destino);
        if (exists) {
            return;
        }
        FotoPublicacao publicacao = new FotoPublicacao();
        publicacao.setDestino(destino);
        publicacao.setPublicadoEm(publicadoEm);
        publicacao.setExpiresAt(expiresAt);
        publicacao.setStatus(FotoPublicacaoStatus.ATIVO);
        foto.addPublicacao(publicacao);
    }

    private FotoResponse toResponse(Foto foto) {
        String mime = foto.getMimeType() == null ? "" : foto.getMimeType();
        Instant now = Instant.now();
        List<FotoTipo> destinos = new ArrayList<>();
        Instant storyExpiry = foto.getExpiresAt();
        List<FotoPublicacao> publicacoes = foto.getPublicacoes() == null ? List.of() : foto.getPublicacoes();
        for (FotoPublicacao publicacao : publicacoes) {
            if (publicacao.getStatus() != FotoPublicacaoStatus.ATIVO) {
                continue;
            }
            if (publicacao.getDestino() == FotoTipo.STORY) {
                if (publicacao.getExpiresAt() != null) {
                    storyExpiry = publicacao.getExpiresAt();
                }
                if (publicacao.getExpiresAt() != null && !publicacao.getExpiresAt().isAfter(now)) {
                    continue;
                }
            }
            destinos.add(publicacao.getDestino());
        }
        return new FotoResponse(
                foto.getId(),
                foto.getNomeArquivo(),
                foto.getUrl(),
                foto.getStatus() == FotoStatus.APROVADA,
                foto.getCreatedAt(),
                foto.getDestinosSolicitados() == FotoDestinos.STORY ? FotoTipo.STORY : FotoTipo.MURAL,
                foto.getMimeType(),
                storyExpiry,
                mime.startsWith("video/"),
                foto.getStatus(),
                foto.getDestinosSolicitados(),
                destinos
        );
    }
}
