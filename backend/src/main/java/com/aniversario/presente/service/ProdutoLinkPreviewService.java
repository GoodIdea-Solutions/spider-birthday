package com.aniversario.presente.service;

import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;

import com.aniversario.exception.ApiException;
import com.aniversario.presente.dto.ProdutoLinkPreviewResponse;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
public class ProdutoLinkPreviewService {

    private static final Duration CONNECT_TIMEOUT = Duration.ofSeconds(5);
    private static final Duration REQUEST_TIMEOUT = Duration.ofSeconds(8);
    private static final int MAX_REDIRECTS = 5;
    private static final int MAX_HTML_BYTES = 1_500_000;
    private static final String USER_AGENT =
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";
    private static final Set<Integer> REDIRECT_CODES = Set.of(301, 302, 303, 307, 308);

    private final ProdutoMetadataParser parser;
    private final HttpClient httpClient;

    public ProdutoLinkPreviewService(ProdutoMetadataParser parser) {
        this.parser = parser;
        this.httpClient = HttpClient.newBuilder()
                .followRedirects(HttpClient.Redirect.NEVER)
                .connectTimeout(CONNECT_TIMEOUT)
                .build();
    }

    public ProdutoLinkPreviewResponse preview(String url) {
        URI current = PublicHttpUrlValidator.parsePublicHttpUrl(url);
        try {
            HttpResponse<InputStream> response = fetchFollowingRedirects(current);
            try (InputStream body = response.body()) {
                int status = response.statusCode();
                if (status < 200 || status >= 300) {
                    throw falhaLeitura();
                }
                String contentType = response.headers().firstValue("Content-Type").orElse("text/html");
                if (!pareceHtml(contentType)) {
                    throw falhaLeitura();
                }
                String html = lerHtml(body, charsetDe(contentType));
                String pageUrl = response.uri() == null ? current.toString() : response.uri().toString();
                return parser.parse(html, pageUrl);
            }
        } catch (ApiException ex) {
            throw ex;
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw falhaLeitura();
        } catch (Exception ex) {
            throw falhaLeitura();
        }
    }

    private HttpResponse<InputStream> fetchFollowingRedirects(URI start) throws IOException, InterruptedException {
        URI current = start;
        for (int i = 0; i <= MAX_REDIRECTS; i++) {
            PublicHttpUrlValidator.assertPublicHttpUri(current);
            HttpRequest request = HttpRequest.newBuilder(current)
                    .timeout(REQUEST_TIMEOUT)
                    .GET()
                    .header("User-Agent", USER_AGENT)
                    .header("Accept", "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8")
                    .header("Accept-Language", "pt-BR,pt;q=0.9,en;q=0.8")
                    .build();
            HttpResponse<InputStream> response = httpClient.send(request, HttpResponse.BodyHandlers.ofInputStream());
            if (!REDIRECT_CODES.contains(response.statusCode())) {
                return response;
            }
            Optional<String> location = response.headers().firstValue("Location");
            consumeQuietly(response.body());
            if (location.isEmpty() || location.get().isBlank()) {
                throw falhaLeitura();
            }
            try {
                current = current.resolve(location.get().trim());
            } catch (IllegalArgumentException ex) {
                throw falhaLeitura();
            }
        }
        throw falhaLeitura();
    }

    private String lerHtml(InputStream in, Charset charset) throws IOException {
        byte[] data = in.readNBytes(MAX_HTML_BYTES + 1);
        if (data.length > MAX_HTML_BYTES) {
            throw falhaLeitura();
        }
        return new String(data, charset);
    }

    private boolean pareceHtml(String contentType) {
        String value = contentType.toLowerCase(Locale.ROOT);
        return value.contains("text/html")
                || value.contains("application/xhtml")
                || value.contains("text/plain")
                || value.contains("application/xml")
                || value.contains("text/xml")
                || !value.contains("/");
    }

    private Charset charsetDe(String contentType) {
        int idx = contentType.toLowerCase(Locale.ROOT).indexOf("charset=");
        if (idx < 0) {
            return StandardCharsets.UTF_8;
        }
        String raw = contentType.substring(idx + "charset=".length()).trim();
        int end = raw.indexOf(';');
        if (end >= 0) {
            raw = raw.substring(0, end);
        }
        raw = raw.replace("\"", "").trim();
        try {
            return Charset.forName(raw);
        } catch (Exception ex) {
            return StandardCharsets.UTF_8;
        }
    }

    private void consumeQuietly(InputStream body) {
        if (body == null) {
            return;
        }
        try (InputStream in = body) {
            in.readNBytes(MAX_HTML_BYTES);
        } catch (IOException ignored) {
            // Corpo do redirect não é necessário.
        }
    }

    private ApiException falhaLeitura() {
        return new ApiException(
                HttpStatus.BAD_GATEWAY,
                "Não foi possível ler os dados desta loja. Preencha na mão."
        );
    }
}
