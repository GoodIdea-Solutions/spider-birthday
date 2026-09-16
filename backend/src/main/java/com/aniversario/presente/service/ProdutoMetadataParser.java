package com.aniversario.presente.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URI;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;

import com.aniversario.presente.dto.ProdutoLinkPreviewResponse;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.springframework.stereotype.Component;

@Component
public class ProdutoMetadataParser {

    private static final int MAX_TITULO = 150;
    private static final int MAX_DESCRICAO = 500;
    private static final int MAX_IMAGEM_URL = 2000;
    private static final Set<String> TITULOS_GENERICOS = Set.of(
            "amazon",
            "amazon.com",
            "amazon.com.br",
            "amazon.com.br: amazon.com.br",
            "mercado livre",
            "mercadolivre",
            "magazine luiza",
            "magalu",
            "shopee",
            "shopee brasil",
            "americanas",
            "shoptime",
            "submarino"
    );

    private final ObjectMapper objectMapper;

    public ProdutoMetadataParser(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public ProdutoLinkPreviewResponse parse(String html, String pageUrl) {
        Document doc = Jsoup.parse(html == null ? "" : html, pageUrl == null ? "" : pageUrl);
        JsonLdDados jsonLd = extrairJsonLd(doc);

        String titulo = limparTitulo(primeiro(
                meta(doc, "og:title"),
                jsonLd.titulo,
                texto(doc.title())
        ));
        String descricao = truncar(primeiro(
                meta(doc, "og:description"),
                jsonLd.descricao
        ), MAX_DESCRICAO);
        String preco = normalizarPreco(primeiro(
                jsonLd.preco,
                meta(doc, "product:price:amount"),
                meta(doc, "og:price:amount"),
                meta(doc, "product:price")
        ));
        String imagemUrl = resolverImagem(primeiro(
                meta(doc, "og:image"),
                jsonLd.imagem,
                meta(doc, "twitter:image"),
                meta(doc, "twitter:image:src")
        ), pageUrl);

        List<String> encontrados = new ArrayList<>();
        if (titulo != null) {
            encontrados.add("titulo");
        }
        if (descricao != null) {
            encontrados.add("descricao");
        }
        if (preco != null) {
            encontrados.add("preco");
        }
        if (imagemUrl != null) {
            encontrados.add("imagem");
        }
        return new ProdutoLinkPreviewResponse(titulo, descricao, preco, imagemUrl, List.copyOf(encontrados));
    }

    private JsonLdDados extrairJsonLd(Document doc) {
        JsonLdDados dados = new JsonLdDados();
        for (Element script : doc.select("script[type=application/ld+json]")) {
            String raw = limparJsonLd(script.data());
            if (raw == null) {
                continue;
            }
            try {
                walkJsonLd(objectMapper.readTree(raw), 0, dados);
            } catch (Exception ignored) {
                // JSON-LD inválido não impede os demais metadados.
            }
        }
        return dados;
    }

    private void walkJsonLd(JsonNode node, int depth, JsonLdDados dados) {
        if (node == null || node.isNull() || depth > 6) {
            return;
        }
        if (node.isArray()) {
            for (JsonNode child : node) {
                walkJsonLd(child, depth + 1, dados);
            }
            return;
        }
        if (!node.isObject()) {
            return;
        }
        if (isProduct(node)) {
            dados.offerTitulo(textoJson(node.get("name")));
            dados.offerDescricao(textoJson(node.get("description")));
            dados.offerImagem(imagemJson(node.get("image")));
            dados.offerPreco(precoJson(node.get("offers")));
        }
        var fields = node.fields();
        while (fields.hasNext()) {
            walkJsonLd(fields.next().getValue(), depth + 1, dados);
        }
    }

    private boolean isProduct(JsonNode node) {
        JsonNode type = node.get("@type");
        if (type == null || type.isNull()) {
            return false;
        }
        if (type.isArray()) {
            for (JsonNode value : type) {
                if (isProductType(value.asText())) {
                    return true;
                }
            }
            return false;
        }
        return isProductType(type.asText());
    }

    private boolean isProductType(String type) {
        if (type == null || type.isBlank()) {
            return false;
        }
        String value = type.trim();
        int slash = value.lastIndexOf('/');
        if (slash >= 0) {
            value = value.substring(slash + 1);
        }
        return value.equalsIgnoreCase("Product");
    }

    private String imagemJson(JsonNode node) {
        if (node == null || node.isNull()) {
            return null;
        }
        if (node.isArray()) {
            for (JsonNode child : node) {
                String value = imagemJson(child);
                if (value != null) {
                    return value;
                }
            }
            return null;
        }
        if (node.isTextual()) {
            return texto(node.asText());
        }
        if (node.isObject()) {
            return primeiro(textoJson(node.get("url")), textoJson(node.get("@id")), textoJson(node.get("contentUrl")));
        }
        return null;
    }

    private String precoJson(JsonNode node) {
        if (node == null || node.isNull()) {
            return null;
        }
        if (node.isArray()) {
            for (JsonNode child : node) {
                String value = precoJson(child);
                if (value != null) {
                    return value;
                }
            }
            return null;
        }
        if (!node.isObject()) {
            return null;
        }
        return primeiro(
                textoJson(node.get("price")),
                textoJson(node.get("lowPrice")),
                precoJson(node.get("priceSpecification"))
        );
    }

    private String textoJson(JsonNode node) {
        if (node == null || node.isNull()) {
            return null;
        }
        if (node.isNumber()) {
            return node.asText();
        }
        if (node.isTextual()) {
            return texto(node.asText());
        }
        if (node.isArray() && node.size() > 0) {
            return textoJson(node.get(0));
        }
        return null;
    }

    private String meta(Document doc, String property) {
        for (Element element : doc.select("meta")) {
            String key = primeiro(texto(element.attr("property")), texto(element.attr("name")));
            if (property.equalsIgnoreCase(key)) {
                String content = texto(element.attr("content"));
                if (content != null) {
                    return content;
                }
            }
        }
        return null;
    }

    private String limparTitulo(String titulo) {
        String value = truncar(titulo, MAX_TITULO);
        if (value == null) {
            return null;
        }
        String normalized = value.toLowerCase(Locale.ROOT).replace('\u00A0', ' ').trim();
        if (TITULOS_GENERICOS.contains(normalized)) {
            return null;
        }
        return value;
    }

    private String resolverImagem(String raw, String pageUrl) {
        String value = texto(raw);
        if (value == null) {
            return null;
        }
        if (value.startsWith("//")) {
            value = "https:" + value;
        } else if (!value.startsWith("http://") && !value.startsWith("https://")) {
            if (pageUrl == null || pageUrl.isBlank()) {
                return null;
            }
            try {
                value = URI.create(pageUrl).resolve(value).toString();
            } catch (IllegalArgumentException ex) {
                return null;
            }
        }
        if ((!value.startsWith("http://") && !value.startsWith("https://")) || value.length() > MAX_IMAGEM_URL) {
            return null;
        }
        return value;
    }

    private String normalizarPreco(String raw) {
        String value = texto(raw);
        if (value == null) {
            return null;
        }
        String cleaned = value.replace("R$", "").replace('\u00A0', ' ').replace(" ", "").trim();
        if (cleaned.isEmpty()) {
            return null;
        }

        int lastComma = cleaned.lastIndexOf(',');
        int lastDot = cleaned.lastIndexOf('.');
        String normalized;
        if (lastComma >= 0 && lastDot >= 0) {
            if (lastComma > lastDot) {
                normalized = cleaned.replace(".", "").replace(',', '.');
            } else {
                normalized = cleaned.replace(",", "");
            }
        } else if (lastComma >= 0) {
            normalized = cleaned.replace(',', '.');
        } else {
            normalized = cleaned;
        }

        try {
            BigDecimal preco = new BigDecimal(normalized);
            if (preco.signum() < 0 || preco.stripTrailingZeros().scale() > 2) {
                return null;
            }
            return preco.setScale(2, RoundingMode.HALF_UP).toPlainString();
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private String limparJsonLd(String raw) {
        String value = texto(raw);
        if (value == null) {
            return null;
        }
        if (value.startsWith("<!--")) {
            value = value.replaceFirst("^<!--", "").replaceFirst("-->$", "").trim();
        }
        return texto(value);
    }

    private String truncar(String value, int max) {
        String text = texto(value);
        if (text == null || text.length() <= max) {
            return text;
        }
        String cut = text.substring(0, max).trim();
        int lastSpace = cut.lastIndexOf(' ');
        if (lastSpace >= max / 2) {
            cut = cut.substring(0, lastSpace).trim();
        }
        return texto(cut);
    }

    private String primeiro(String... values) {
        if (values == null) {
            return null;
        }
        for (String value : values) {
            String text = texto(value);
            if (text != null) {
                return text;
            }
        }
        return null;
    }

    private String texto(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.replace('\u00A0', ' ').trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private static final class JsonLdDados {
        private String titulo;
        private String descricao;
        private String preco;
        private String imagem;

        private void offerTitulo(String value) {
            if (titulo == null && value != null && !value.isBlank()) {
                titulo = value.trim();
            }
        }

        private void offerDescricao(String value) {
            if (descricao == null && value != null && !value.isBlank()) {
                descricao = value.trim();
            }
        }

        private void offerPreco(String value) {
            if (preco == null && value != null && !value.isBlank()) {
                preco = value.trim();
            }
        }

        private void offerImagem(String value) {
            if (imagem == null && value != null && !value.isBlank()) {
                imagem = value.trim();
            }
        }
    }
}
