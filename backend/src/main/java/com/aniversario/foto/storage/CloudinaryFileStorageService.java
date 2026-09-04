package com.aniversario.foto.storage;

import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Files;
import java.nio.file.InvalidPathException;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Duration;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

import com.aniversario.config.CloudinaryProperties;
import com.aniversario.config.StorageProperties;
import com.aniversario.exception.ApiException;
import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.web.multipart.MultipartFile;

/**
 * Upload para o Cloudinary. {@code Foto.nomeArquivo} guarda {@code resourceType:publicId}
 * (ex.: {@code image:spider-birthday/uuid}) para destroy e download.
 * Arquivos antigos em disco continuam acessíveis pelo nome UUID local.
 */
public class CloudinaryFileStorageService implements CloudStorageService {

    private static final Logger log = LoggerFactory.getLogger(CloudinaryFileStorageService.class);

    private final Cloudinary cloudinary;
    private final CloudinaryProperties cloudinaryProperties;
    private final StorageProperties storageProperties;
    private final HttpClient httpClient;
    private Path uploadRoot;

    public CloudinaryFileStorageService(
            CloudinaryProperties cloudinaryProperties,
            StorageProperties storageProperties
    ) {
        this.cloudinaryProperties = cloudinaryProperties;
        this.storageProperties = storageProperties;
        this.cloudinary = new Cloudinary(ObjectUtils.asMap(
                "cloud_name", cloudinaryProperties.getCloudName(),
                "api_key", cloudinaryProperties.getApiKey(),
                "api_secret", cloudinaryProperties.getApiSecret(),
                "secure", true
        ));
        this.httpClient = HttpClient.newBuilder()
                .followRedirects(HttpClient.Redirect.NORMAL)
                .connectTimeout(Duration.ofSeconds(20))
                .build();
    }

    @PostConstruct
    void initLegacyDir() {
        try {
            uploadRoot = Paths.get(storageProperties.getUploadDir()).toAbsolutePath().normalize();
            Files.createDirectories(uploadRoot);
        } catch (IOException e) {
            log.warn("Não foi possível preparar o diretório local de uploads (legado): {}", e.getMessage());
            uploadRoot = Paths.get(storageProperties.getUploadDir()).toAbsolutePath().normalize();
        }
    }

    @Override
    public StoredFile store(MultipartFile file) {
        MediaUploadValidator.validate(file);
        String contentType = MediaUploadValidator.contentType(file);
        boolean video = MediaUploadValidator.isVideo(contentType);
        String publicId = UUID.randomUUID().toString();
        Path temp = null;
        try {
            temp = Files.createTempFile("cloudinary-upload-", video ? ".mp4" : ".img");
            file.transferTo(temp);
            @SuppressWarnings("unchecked")
            Map<String, Object> result = cloudinary.uploader().upload(
                    temp.toFile(),
                    ObjectUtils.asMap(
                            "folder", cloudinaryProperties.getFolder(),
                            "public_id", publicId,
                            "resource_type", "auto",
                            "overwrite", false
                    )
            );
            String storedPublicId = String.valueOf(result.get("public_id"));
            String resourceType = String.valueOf(result.getOrDefault("resource_type", video ? "video" : "image"));
            String secureUrl = result.get("secure_url") != null
                    ? String.valueOf(result.get("secure_url"))
                    : String.valueOf(result.get("url"));
            if (secureUrl == null || secureUrl.isBlank() || "null".equals(secureUrl)) {
                throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Cloudinary não retornou URL do arquivo.");
            }
            if (secureUrl.startsWith("http://")) {
                secureUrl = "https://" + secureUrl.substring("http://".length());
            }
            return new StoredFile(resourceType + ":" + storedPublicId, secureUrl);
        } catch (ApiException e) {
            throw e;
        } catch (Exception e) {
            log.error("Falha no upload Cloudinary", e);
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Falha ao enviar o arquivo para o Cloudinary.");
        } finally {
            if (temp != null) {
                try {
                    Files.deleteIfExists(temp);
                } catch (IOException ignored) {
                    // best-effort
                }
            }
        }
    }

    @Override
    public void delete(String fileName) {
        if (fileName == null || fileName.isBlank()) {
            return;
        }
        Path local = localPathIfExists(fileName);
        if (local != null) {
            try {
                Files.deleteIfExists(local);
            } catch (IOException ignored) {
                // best-effort cleanup
            }
            return;
        }
        CloudinaryRef ref = CloudinaryRef.parse(fileName);
        try {
            cloudinary.uploader().destroy(
                    ref.publicId(),
                    ObjectUtils.asMap(
                            "resource_type", ref.resourceType(),
                            "invalidate", true
                    )
            );
        } catch (Exception e) {
            log.warn("Falha ao excluir {} no Cloudinary: {}", ref.publicId(), e.getMessage());
        }
    }

    @Override
    public Resource open(String fileName) {
        return open(fileName, null);
    }

    @Override
    public Resource open(String fileName, String publicUrl) {
        Path local = localPathIfExists(fileName);
        if (local != null) {
            return new FileSystemResource(local);
        }
        String remoteUrl = usableRemoteUrl(publicUrl);
        if (remoteUrl == null && fileName != null && !fileName.isBlank()) {
            CloudinaryRef ref = CloudinaryRef.parse(fileName);
            remoteUrl = cloudinary.url()
                    .resourceType(ref.resourceType())
                    .secure(true)
                    .generate(ref.publicId());
        }
        if (remoteUrl == null || remoteUrl.isBlank()) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Arquivo não encontrado.");
        }
        return fetchToTemp(remoteUrl, fileName);
    }

    private String usableRemoteUrl(String publicUrl) {
        if (publicUrl == null || publicUrl.isBlank()) {
            return null;
        }
        String trimmed = publicUrl.trim();
        if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
            return null;
        }
        String base = storageProperties.getPublicBaseUrl();
        if (base != null && !base.isBlank() && trimmed.startsWith(base)) {
            return null;
        }
        return trimmed.startsWith("http://")
                ? "https://" + trimmed.substring("http://".length())
                : trimmed;
    }

    private Resource fetchToTemp(String url, String fileName) {
        Path temp = null;
        try {
            String suffix = suffixFrom(fileName, url);
            temp = Files.createTempFile("spider-download-", suffix);
            HttpRequest request = HttpRequest.newBuilder(URI.create(url))
                    .timeout(Duration.ofMinutes(2))
                    .GET()
                    .build();
            HttpResponse<Path> response = httpClient.send(request, HttpResponse.BodyHandlers.ofFile(temp));
            if (response.statusCode() >= 400) {
                Files.deleteIfExists(temp);
                throw new ApiException(HttpStatus.NOT_FOUND, "Arquivo não encontrado.");
            }
            Path stored = temp;
            stored.toFile().deleteOnExit();
            return new FileSystemResource(stored) {
                @Override
                public InputStream getInputStream() throws IOException {
                    return new DeleteOnCloseInputStream(stored);
                }
            };
        } catch (ApiException e) {
            throw e;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            deleteQuietly(temp);
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Download interrompido.");
        } catch (IOException | IllegalArgumentException e) {
            deleteQuietly(temp);
            log.warn("Falha ao baixar mídia remota {}: {}", url, e.getMessage());
            throw new ApiException(HttpStatus.NOT_FOUND, "Arquivo não encontrado.");
        }
    }

    private Path localPathIfExists(String fileName) {
        if (fileName == null || fileName.isBlank() || uploadRoot == null) {
            return null;
        }
        if (fileName.contains(":")) {
            return null;
        }
        try {
            Path target = uploadRoot.resolve(fileName).normalize();
            if (!target.startsWith(uploadRoot) || !Files.isRegularFile(target)) {
                return null;
            }
            return target;
        } catch (InvalidPathException e) {
            return null;
        }
    }

    private static String suffixFrom(String fileName, String url) {
        String source = url != null ? url : fileName;
        if (source == null) {
            return ".bin";
        }
        String lower = source.toLowerCase(Locale.ROOT);
        if (lower.contains(".png")) {
            return ".png";
        }
        if (lower.contains(".webp")) {
            return ".webp";
        }
        if (lower.contains(".mp4")) {
            return ".mp4";
        }
        if (lower.contains(".webm")) {
            return ".webm";
        }
        if (lower.contains(".jpg") || lower.contains(".jpeg")) {
            return ".jpg";
        }
        return ".bin";
    }

    private static void deleteQuietly(Path path) {
        if (path == null) {
            return;
        }
        try {
            Files.deleteIfExists(path);
        } catch (IOException ignored) {
            // best-effort
        }
    }

    private record CloudinaryRef(String resourceType, String publicId) {
        static CloudinaryRef parse(String fileName) {
            int colon = fileName.indexOf(':');
            if (colon > 0 && colon < fileName.length() - 1) {
                return new CloudinaryRef(fileName.substring(0, colon), fileName.substring(colon + 1));
            }
            return new CloudinaryRef("image", fileName);
        }
    }

    private static final class DeleteOnCloseInputStream extends java.io.FilterInputStream {
        private final Path path;

        private DeleteOnCloseInputStream(Path path) throws IOException {
            super(Files.newInputStream(path));
            this.path = path;
        }

        @Override
        public void close() throws IOException {
            try {
                super.close();
            } finally {
                Files.deleteIfExists(path);
            }
        }
    }
}
