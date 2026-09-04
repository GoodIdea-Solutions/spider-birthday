package com.aniversario.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "app")
public class AppProperties {
    private String adminToken = "troque-este-token";
    private Cors cors = new Cors();

    @Getter
    @Setter
    public static class Cors {
        private String allowedOrigins = "http://localhost:4200";
    }
}
