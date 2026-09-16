package com.aniversario.presente.service;

import java.net.InetAddress;
import java.net.URI;
import java.net.UnknownHostException;
import java.util.Locale;

import com.aniversario.exception.ApiException;
import org.springframework.http.HttpStatus;

final class PublicHttpUrlValidator {

    private static final int MAX_URL_LENGTH = 2000;

    private PublicHttpUrlValidator() {
    }

    static URI parsePublicHttpUrl(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Informe o link da loja.");
        }
        String value = raw.trim();
        if (value.length() > MAX_URL_LENGTH) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Link da loja deve ter no máximo 2000 caracteres.");
        }

        URI uri;
        try {
            uri = URI.create(value);
        } catch (IllegalArgumentException ex) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Link da loja inválido.");
        }

        assertPublicHttpUri(uri);
        return uri.normalize();
    }

    static void assertPublicHttpUri(URI uri) {
        if (uri == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Link da loja inválido.");
        }
        String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase(Locale.ROOT);
        if (!scheme.equals("http") && !scheme.equals("https")) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Link da loja deve começar com http:// ou https://.");
        }

        String host = uri.getHost();
        if (host == null || host.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Link da loja inválido.");
        }

        String normalizedHost = host.toLowerCase(Locale.ROOT);
        if (normalizedHost.equals("localhost")
                || normalizedHost.endsWith(".localhost")
                || normalizedHost.endsWith(".local")
                || normalizedHost.endsWith(".internal")
                || normalizedHost.endsWith(".arpa")) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Link da loja inválido.");
        }

        InetAddress[] addresses;
        try {
            addresses = InetAddress.getAllByName(host);
        } catch (UnknownHostException ex) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Não foi possível ler os dados desta loja. Preencha na mão.");
        }
        if (addresses.length == 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Não foi possível ler os dados desta loja. Preencha na mão.");
        }
        for (InetAddress address : addresses) {
            if (isForbidden(address)) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Link da loja inválido.");
            }
        }
    }

    static boolean isForbidden(InetAddress address) {
        if (address.isAnyLocalAddress()
                || address.isLoopbackAddress()
                || address.isLinkLocalAddress()
                || address.isSiteLocalAddress()
                || address.isMulticastAddress()) {
            return true;
        }
        byte[] bytes = address.getAddress();
        if (bytes.length == 4) {
            return isForbiddenIpv4(bytes);
        }
        if (bytes.length == 16) {
            if (isIpv4Mapped(bytes)) {
                return isForbiddenIpv4(new byte[]{bytes[12], bytes[13], bytes[14], bytes[15]});
            }
            int first = bytes[0] & 0xff;
            return first >= 0xfc && first <= 0xfd;
        }
        return false;
    }

    private static boolean isForbiddenIpv4(byte[] bytes) {
        int b0 = bytes[0] & 0xff;
        int b1 = bytes[1] & 0xff;
        if (b0 == 0) {
            return true;
        }
        return b0 == 100 && b1 >= 64 && b1 <= 127;
    }

    private static boolean isIpv4Mapped(byte[] bytes) {
        for (int i = 0; i < 10; i++) {
            if (bytes[i] != 0) {
                return false;
            }
        }
        return (bytes[10] & 0xff) == 0xff && (bytes[11] & 0xff) == 0xff;
    }
}
