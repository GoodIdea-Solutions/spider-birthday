package com.aniversario.foto.storage;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Locale;
import java.util.UUID;

import com.aniversario.config.StorageProperties;
import com.aniversario.exception.ApiException;
import jakarta.annotation.PostConstruct;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

public class LocalFileStorageService implements FileStorageService {

    private final StorageProperties storageProperties;
    private Path uploadRoot;

    public LocalFileStorageService(StorageProperties storageProperties) {
        this.storageProperties = storageProperties;
    }

    @PostConstruct
    void init() {
        try {
            uploadRoot = Paths.get(storageProperties.getUploadDir()).toAbsolutePath().normalize();
            Files.createDirectories(uploadRoot);
        } catch (IOException e) {
            throw new IllegalStateException("Não foi possível criar o diretório de uploads.", e);
        }
    }

    @Override
    public StoredFile store(MultipartFile file) {
        MediaUploadValidator.validate(file);
        String contentType = MediaUploadValidator.contentType(file);

        String original = StringUtils.cleanPath(file.getOriginalFilename() == null ? "foto" : file.getOriginalFilename());
        String extension = resolveExtension(original, contentType);
        String storedName = UUID.randomUUID() + extension;
        Path destination = uploadRoot.resolve(storedName).normalize();

        if (!destination.startsWith(uploadRoot)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Nome de arquivo inválido.");
        }

        try {
            Files.copy(file.getInputStream(), destination, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Falha ao salvar o arquivo.");
        }

        String baseUrl = storageProperties.getPublicBaseUrl();
        if (baseUrl.endsWith("/")) {
            baseUrl = baseUrl.substring(0, baseUrl.length() - 1);
        }
        return new StoredFile(storedName, baseUrl + "/" + storedName);
    }

    @Override
    public void delete(String fileName) {
        Path target = localPathIfExists(fileName);
        if (target == null) {
            return;
        }
        try {
            Files.deleteIfExists(target);
        } catch (IOException ignored) {
            // best-effort cleanup
        }
    }

    @Override
    public Resource open(String fileName) {
        Path target = localPathIfExists(fileName);
        if (target == null) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Arquivo não encontrado.");
        }
        return new FileSystemResource(target);
    }

    private Path localPathIfExists(String fileName) {
        if (fileName == null || fileName.isBlank()) {
            return null;
        }
        Path target = uploadRoot.resolve(fileName).normalize();
        if (!target.startsWith(uploadRoot) || !Files.isRegularFile(target)) {
            return null;
        }
        return target;
    }

    private String resolveExtension(String original, String contentType) {
        String lower = original.toLowerCase(Locale.ROOT);
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) {
            return ".jpg";
        }
        if (lower.endsWith(".png")) {
            return ".png";
        }
        if (lower.endsWith(".webp")) {
            return ".webp";
        }
        if (lower.endsWith(".mp4")) {
            return ".mp4";
        }
        if (lower.endsWith(".webm")) {
            return ".webm";
        }
        return switch (contentType) {
            case "image/png" -> ".png";
            case "image/webp" -> ".webp";
            case "video/mp4" -> ".mp4";
            case "video/webm" -> ".webm";
            default -> ".jpg";
        };
    }
}
