package com.aniversario;

import com.aniversario.config.PartyProperties;
import com.aniversario.config.StorageProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication
@EnableConfigurationProperties({PartyProperties.class, StorageProperties.class})
public class AniversarioApplication {

    public static void main(String[] args) {
        SpringApplication.run(AniversarioApplication.class, args);
    }
}
