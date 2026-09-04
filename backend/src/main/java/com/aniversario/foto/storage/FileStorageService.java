package com.aniversario.foto.storage;

import java.nio.file.Path;

import org.springframework.web.multipart.MultipartFile;

public interface FileStorageService {
    StoredFile store(MultipartFile file);

    void delete(String fileName);

    Path resolve(String fileName);
}
