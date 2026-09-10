package com.aniversario.presente.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Locale;
import java.util.Set;

import com.aniversario.exception.ApiException;
import com.aniversario.foto.storage.FileStorageService;
import com.aniversario.foto.storage.StoredFile;
import com.aniversario.presente.dto.PresenteAdminResponse;
import com.aniversario.presente.dto.PresenteResponse;
import com.aniversario.presente.dto.ReservaAdminResponse;
import com.aniversario.presente.model.Presente;
import com.aniversario.presente.model.ReservaPresente;
import com.aniversario.presente.repository.PresenteRepository;
import com.aniversario.presente.repository.ReservaPresenteRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class PresenteService {

    private static final Set<String> IMAGE_TYPES = Set.of("image/jpeg", "image/png", "image/webp");
    private static final long MAX_IMAGE_BYTES = 10L * 1024 * 1024;
    private static final BigDecimal PRECO_MAXIMO = new BigDecimal("99999999.99");

    private final PresenteRepository presenteRepository;
    private final ReservaPresenteRepository reservaPresenteRepository;
    private final FileStorageService fileStorageService;

    public PresenteService(
            PresenteRepository presenteRepository,
            ReservaPresenteRepository reservaPresenteRepository,
            FileStorageService fileStorageService
    ) {
        this.presenteRepository = presenteRepository;
        this.reservaPresenteRepository = reservaPresenteRepository;
        this.fileStorageService = fileStorageService;
    }

    @Transactional(readOnly = true)
    public List<PresenteResponse> listarAtivos() {
        Set<Long> reservados = reservaPresenteRepository.findAllPresenteIds();
        return presenteRepository.findByAtivoTrueOrderByNomeAsc().stream()
                .map(presente -> toResponse(presente, reservados.contains(presente.getId())))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<PresenteAdminResponse> listarAdmin() {
        return presenteRepository.findAllWithReservaOrderByNomeAsc().stream()
                .map(this::toAdminResponse)
                .toList();
    }

    @Transactional
    public PresenteAdminResponse criar(
            String nome,
            String descricao,
            String link,
            String preco,
            Boolean ativo,
            String imagemUrl,
            MultipartFile file
    ) {
        Presente presente = new Presente();
        aplicarCampos(presente, nome, descricao, link, preco, ativo);
        aplicarImagem(presente, imagemUrl, file, false);
        return toAdminResponse(presenteRepository.save(presente));
    }

    @Transactional
    public PresenteAdminResponse atualizar(
            Long id,
            String nome,
            String descricao,
            String link,
            String preco,
            Boolean ativo,
            String imagemUrl,
            MultipartFile file
    ) {
        Presente presente = presenteRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Presente não encontrado."));
        aplicarCampos(presente, nome, descricao, link, preco, ativo);
        aplicarImagem(presente, imagemUrl, file, true);
        return toAdminResponse(presenteRepository.save(presente));
    }

    @Transactional
    public void excluir(Long id) {
        Presente presente = presenteRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Presente não encontrado."));
        apagarArquivo(presente.getImagemArquivo());
        presenteRepository.delete(presente);
    }

    private void aplicarCampos(Presente presente, String nome, String descricao, String link, String preco, Boolean ativo) {
        String nomeLimpo = trimToNull(nome);
        if (nomeLimpo == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Nome é obrigatório.");
        }
        if (nomeLimpo.length() > 150) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Nome deve ter no máximo 150 caracteres.");
        }
        presente.setNome(nomeLimpo);
        presente.setDescricao(limitar(trimToNull(descricao), 500, "Descrição"));
        presente.setLink(validarUrl(trimToNull(link), "Link da loja"));
        presente.setPreco(parsePreco(preco));
        presente.setAtivo(ativo == null || ativo);
    }

    private BigDecimal parsePreco(String raw) {
        String value = trimToNull(raw);
        if (value == null) {
            return null;
        }
        String cleaned = value.replace("R$", "").replace('\u00A0', ' ').replace(" ", "").trim();
        if (cleaned.isEmpty()) {
            return null;
        }

        int lastComma = cleaned.lastIndexOf(',');
        int lastDot = cleaned.lastIndexOf('.');
        String normalized;
        if (lastComma >= 0 && lastDot >= 0) {
            if (lastComma > lastDot) {
                normalized = cleaned.replace(".", "").replace(',', '.');
            } else {
                normalized = cleaned.replace(",", "");
            }
        } else if (lastComma >= 0) {
            normalized = cleaned.replace(',', '.');
        } else {
            normalized = cleaned;
        }

        BigDecimal preco;
        try {
            preco = new BigDecimal(normalized);
        } catch (NumberFormatException ex) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Preço inválido. Use um valor como 89,90.");
        }

        if (preco.signum() < 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Preço não pode ser negativo.");
        }
        if (preco.stripTrailingZeros().scale() > 2) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Preço deve ter no máximo duas casas decimais.");
        }
        if (preco.compareTo(PRECO_MAXIMO) > 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Preço deve ser no máximo R$ 99.999.999,99.");
        }
        return preco.setScale(2, RoundingMode.HALF_UP);
    }

    private void aplicarImagem(Presente presente, String imagemUrl, MultipartFile file, boolean atualizar) {
        boolean temArquivo = file != null && !file.isEmpty();
        String urlInformada = validarUrl(trimToNull(imagemUrl), "URL da imagem");

        if (!temArquivo && urlInformada == null && atualizar) {
            return;
        }

        if (temArquivo) {
            validarImagem(file);
            StoredFile stored = fileStorageService.store(file);
            apagarArquivo(presente.getImagemArquivo());
            presente.setImagemArquivo(stored.fileName());
            presente.setImagemUrl(stored.url());
            return;
        }

        if (urlInformada != null) {
            if (atualizar && urlInformada.equals(presente.getImagemUrl())) {
                return;
            }
            apagarArquivo(presente.getImagemArquivo());
            presente.setImagemArquivo(null);
            presente.setImagemUrl(urlInformada);
        }
    }

    private void validarImagem(MultipartFile file) {
        String contentType = file.getContentType() == null ? "" : file.getContentType().toLowerCase(Locale.ROOT);
        if (!IMAGE_TYPES.contains(contentType)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Formato inválido. Use JPEG, PNG ou WEBP.");
        }
        if (file.getSize() > MAX_IMAGE_BYTES) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Imagem muito grande. Máximo: 10MB.");
        }
    }

    private String validarUrl(String value, String campo) {
        if (value == null) {
            return null;
        }
        if (!value.startsWith("http://") && !value.startsWith("https://")) {
            throw new ApiException(HttpStatus.BAD_REQUEST, campo + " deve começar com http:// ou https://.");
        }
        if (value.length() > 2000) {
            throw new ApiException(HttpStatus.BAD_REQUEST, campo + " deve ter no máximo 2000 caracteres.");
        }
        return value;
    }

    private String limitar(String value, int max, String campo) {
        if (value != null && value.length() > max) {
            throw new ApiException(HttpStatus.BAD_REQUEST, campo + " deve ter no máximo " + max + " caracteres.");
        }
        return value;
    }

    private void apagarArquivo(String fileName) {
        if (fileName == null || fileName.isBlank()) {
            return;
        }
        try {
            fileStorageService.delete(fileName);
        } catch (RuntimeException ignored) {
            // A exclusão do registro segue mesmo se o arquivo já não existir.
        }
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private PresenteResponse toResponse(Presente presente, boolean reservado) {
        return new PresenteResponse(
                presente.getId(),
                presente.getNome(),
                presente.getDescricao(),
                presente.getImagemUrl(),
                presente.getLink(),
                presente.getPreco(),
                presente.getAtivo(),
                reservado
        );
    }

    private PresenteAdminResponse toAdminResponse(Presente presente) {
        ReservaPresente reserva = presente.getReserva();
        if (reserva == null) {
            reserva = reservaPresenteRepository.findByPresenteId(presente.getId()).orElse(null);
        }
        ReservaAdminResponse reservaDto = reserva == null ? null : new ReservaAdminResponse(
                reserva.getId(),
                reserva.getNomeConvidado(),
                reserva.getTelefone(),
                reserva.getCreatedAt()
        );
        return new PresenteAdminResponse(
                presente.getId(),
                presente.getNome(),
                presente.getDescricao(),
                presente.getImagemUrl(),
                presente.getLink(),
                presente.getPreco(),
                presente.getAtivo(),
                reservaDto != null,
                reservaDto
        );
    }
}
