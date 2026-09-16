package com.aniversario.presente.service;

import java.nio.charset.StandardCharsets;

import com.aniversario.presente.dto.ProdutoLinkPreviewResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class ProdutoMetadataParserTest {

    private ProdutoMetadataParser parser;

    @BeforeEach
    void setUp() {
        parser = new ProdutoMetadataParser(new ObjectMapper());
    }

    @Test
    void extraiJsonLdDoMercadoLivre() {
        ProdutoLinkPreviewResponse preview = parser.parse(
                fixture("produto-preview/mercadolivre.html"),
                "https://www.mercadolivre.com.br/item"
        );

        assertThat(preview.titulo()).isEqualTo("Lego Homem-Aranha 123");
        assertThat(preview.descricao()).isEqualTo("Blocos de montar para a festa");
        assertThat(preview.preco()).isEqualTo("189.90");
        assertThat(preview.imagemUrl()).isEqualTo("https://http2.mlstatic.com/foto.jpg");
        assertThat(preview.encontrados()).containsExactly("titulo", "descricao", "preco", "imagem");
    }

    @Test
    void extraiOpenGraphDaAmazonSemPreco() {
        ProdutoLinkPreviewResponse preview = parser.parse(
                fixture("produto-preview/amazon-og.html"),
                "https://www.amazon.com.br/dp/ABC"
        );

        assertThat(preview.titulo()).isEqualTo("Boneco Miles Morales");
        assertThat(preview.preco()).isNull();
        assertThat(preview.imagemUrl()).isEqualTo("https://m.media-amazon.com/images/I/foto.jpg");
        assertThat(preview.encontrados()).containsExactly("titulo", "imagem");
    }

    @Test
    void ignoraTituloGenericoQuandoNaoHaMetadados() {
        ProdutoLinkPreviewResponse preview = parser.parse(
                fixture("produto-preview/sem-metadados.html"),
                "https://www.amazon.com.br/"
        );

        assertThat(preview.titulo()).isNull();
        assertThat(preview.descricao()).isNull();
        assertThat(preview.preco()).isNull();
        assertThat(preview.imagemUrl()).isNull();
        assertThat(preview.encontrados()).isEmpty();
    }

    @Test
    void prefereOgTitleEJsonLdParaPreco() {
        String html = """
                <html><head>
                  <meta property="og:title" content="Título OG"/>
                  <meta property="product:price:amount" content="10,50"/>
                  <script type="application/ld+json">
                  {
                    "@graph": [{
                      "@type": ["Product", "Thing"],
                      "name": "Título JSON",
                      "offers": { "price": 88.5 }
                    }]
                  }
                  </script>
                </head></html>
                """;

        ProdutoLinkPreviewResponse preview = parser.parse(html, "https://loja.exemplo/p/1");

        assertThat(preview.titulo()).isEqualTo("Título OG");
        assertThat(preview.preco()).isEqualTo("88.50");
    }

    @Test
    void resolveImagemRelativaENormalizaPrecoBrasileiro() {
        String html = """
                <html><head>
                  <meta property="og:title" content="Kit de aventura"/>
                  <meta property="og:image" content="/foto.webp"/>
                  <meta property="og:price:amount" content="R$ 1.189,90"/>
                </head></html>
                """;

        ProdutoLinkPreviewResponse preview = parser.parse(html, "https://loja.exemplo/produto");

        assertThat(preview.imagemUrl()).isEqualTo("https://loja.exemplo/foto.webp");
        assertThat(preview.preco()).isEqualTo("1189.90");
    }

    @Test
    void truncaTituloLongo() {
        String titulo = "A".repeat(180);
        String html = "<html><head><meta property=\"og:title\" content=\"" + titulo + "\"/></head></html>";

        ProdutoLinkPreviewResponse preview = parser.parse(html, "https://loja.exemplo/p");

        assertThat(preview.titulo()).hasSizeLessThanOrEqualTo(150);
        assertThat(preview.titulo()).startsWith("A");
    }

    private String fixture(String path) {
        try (var in = getClass().getClassLoader().getResourceAsStream(path)) {
            assertThat(in).isNotNull();
            return new String(in.readAllBytes(), StandardCharsets.UTF_8);
        } catch (Exception ex) {
            throw new IllegalStateException(ex);
        }
    }
}
