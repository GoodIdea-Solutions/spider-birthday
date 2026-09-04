package com.aniversario.foto.storage;

import java.util.Locale;
import java.util.Set;

import com.aniversario.exception.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.web.multipart.MultipartFile;

final class MediaUploadValidator {

    static final long MAX_IMAGE_BYTES = 10L * 1024 * 1024;
    static final long MAX_VIDEO_BYTES = 50L * 1024 * 1024;
    static final Set<String> IMAGE_TYPES = Set.of("image/jpeg", "image/png", "image/webp");
    static final Set<String> VIDEO_TYPES = Set.of("video/mp4", "video/webm");

    private MediaUploadValidator() {
    }

    static String contentType(MultipartFile file) {
        return file.getContentType() == null ? "" : file.getContentType().toLowerCase(Locale.ROOT);
    }

    static boolean isVideo(String contentType) {
        return VIDEO_TYPES.contains(contentType);
    }

    static void validate(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Arquivo é obrigatório.");
        }

        String contentType = contentType(file);
        boolean video = isVideo(contentType);
        boolean image = IMAGE_TYPES.contains(contentType);
        if (!image && !video) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Formato inválido. Use JPEG, PNG, WEBP, MP4 ou WEBM.");
        }

        long max = video ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
        if (file.getSize() > max) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    video ? "Vídeo muito grande. Máximo: 50MB." : "Imagem muito grande. Máximo: 10MB."
            );
        }
    }
}
