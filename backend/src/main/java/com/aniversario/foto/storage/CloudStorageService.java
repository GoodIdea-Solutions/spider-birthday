package com.aniversario.foto.storage;

/**
 * Storage em nuvem. Ativo quando as credenciais Cloudinary estão definidas;
 * caso contrário a aplicação usa {@link LocalFileStorageService}.
 */
public interface CloudStorageService extends FileStorageService {
}
