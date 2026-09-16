package com.aniversario.presente.service;

import java.net.InetAddress;

import com.aniversario.exception.ApiException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PublicHttpUrlValidatorTest {

    @ParameterizedTest
    @ValueSource(strings = {
            "http://127.0.0.1/produto",
            "https://localhost/admin",
            "http://10.0.0.8/item",
            "http://192.168.1.10/x",
            "https://169.254.169.254/latest/meta-data",
            "http://[::1]/",
            "file:///etc/passwd",
            "ftp://exemplo.com/p",
            "not-a-url"
    })
    void rejeitaUrlsInternasOuInvalidas(String url) {
        assertThatThrownBy(() -> PublicHttpUrlValidator.parsePublicHttpUrl(url))
                .isInstanceOf(ApiException.class);
    }

    @Test
    void rejeitaUrlVazia() {
        assertThatThrownBy(() -> PublicHttpUrlValidator.parsePublicHttpUrl("   "))
                .isInstanceOf(ApiException.class);
    }

    @Test
    void rejeitaUrlLongaDemais() {
        String url = "https://loja.exemplo/" + "a".repeat(2000);
        assertThatThrownBy(() -> PublicHttpUrlValidator.parsePublicHttpUrl(url))
                .isInstanceOf(ApiException.class);
    }

    @Test
    void marcaEnderecosPrivadosComoProibidos() throws Exception {
        assertThat(PublicHttpUrlValidator.isForbidden(InetAddress.getByName("127.0.0.1"))).isTrue();
        assertThat(PublicHttpUrlValidator.isForbidden(InetAddress.getByName("10.1.2.3"))).isTrue();
        assertThat(PublicHttpUrlValidator.isForbidden(InetAddress.getByName("192.168.0.5"))).isTrue();
        assertThat(PublicHttpUrlValidator.isForbidden(InetAddress.getByName("169.254.1.1"))).isTrue();
        assertThat(PublicHttpUrlValidator.isForbidden(InetAddress.getByName("100.64.0.1"))).isTrue();
        assertThat(PublicHttpUrlValidator.isForbidden(InetAddress.getByName("8.8.8.8"))).isFalse();
    }
}
