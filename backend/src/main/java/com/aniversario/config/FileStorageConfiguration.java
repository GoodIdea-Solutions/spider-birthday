package com.aniversario.config;

import com.aniversario.foto.storage.CloudinaryFileStorageService;
import com.aniversario.foto.storage.FileStorageService;
import com.aniversario.foto.storage.LocalFileStorageService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties(CloudinaryProperties.class)
public class FileStorageConfiguration {

    private static final Logger log = LoggerFactory.getLogger(FileStorageConfiguration.class);

    @Bean
    public FileStorageService fileStorageService(
            StorageProperties storageProperties,
            CloudinaryProperties cloudinaryProperties
    ) {
        if (cloudinaryProperties.isConfigured()) {
            log.info(
                    "Storage de mídia: Cloudinary (cloud={}, pasta={})",
                    cloudinaryProperties.getCloudName(),
                    cloudinaryProperties.getFolder()
            );
            return new CloudinaryFileStorageService(cloudinaryProperties, storageProperties);
        }
        log.info(
                "Storage de mídia: disco local ({}). Defina CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY e CLOUDINARY_API_SECRET para usar o Cloudinary.",
                storageProperties.getUploadDir()
        );
        return new LocalFileStorageService(storageProperties);
    }
}
