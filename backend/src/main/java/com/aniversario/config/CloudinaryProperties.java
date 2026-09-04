package com.aniversario.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.util.StringUtils;

@Getter
@Setter
@ConfigurationProperties(prefix = "app.storage.cloudinary")
public class CloudinaryProperties {
    private String cloudName = "";
    private String apiKey = "";
    private String apiSecret = "";
    private String folder = "spider-birthday";

    public boolean isConfigured() {
        return StringUtils.hasText(cloudName)
                && StringUtils.hasText(apiKey)
                && StringUtils.hasText(apiSecret);
    }
}
