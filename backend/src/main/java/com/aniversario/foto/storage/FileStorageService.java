package com.aniversario.foto.storage;

import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;

public interface FileStorageService {
    StoredFile store(MultipartFile file);

    void delete(String fileName);

    /**
     * Abre o arquivo para download (disco local ou URL remota do Cloudinary).
     */
    Resource open(String fileName);

    default Resource open(String fileName, String publicUrl) {
        return open(fileName);
    }
}
