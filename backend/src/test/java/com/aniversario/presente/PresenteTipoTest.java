package com.aniversario.presente;

import java.util.Arrays;

import com.aniversario.exception.ErrorResponse;
import com.aniversario.presente.dto.PresenteAdminResponse;
import com.aniversario.presente.dto.PresenteResponse;
import com.aniversario.presente.model.Presente;
import com.aniversario.presente.model.PresenteTipo;
import com.aniversario.presente.repository.PresenteRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
@ActiveProfiles("test")
class PresenteTipoTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @Autowired
    private TestRestTemplate rest;

    @Autowired
    private PresenteRepository presenteRepository;

    @Test
    void criaPresenteComTipoValidoEListaPublicaIncluiTipo() {
        ResponseEntity<PresenteAdminResponse> created = rest.exchange(
                "/api/admin/presentes",
                HttpMethod.POST,
                new HttpEntity<>(formulario("Boneco do Homem-Aranha", "BRINQUEDO"), adminHeaders()),
                PresenteAdminResponse.class
        );

        assertThat(created.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(created.getBody()).isNotNull();
        assertThat(created.getBody().tipo()).isEqualTo(PresenteTipo.BRINQUEDO);

        PresenteResponse listado = encontrarNaLista(created.getBody().id());
        assertThat(listado.tipo()).isEqualTo(PresenteTipo.BRINQUEDO);
        assertThat(listado.nome()).isEqualTo("Boneco do Homem-Aranha");
    }

    @Test
    void atualizaPresenteComTipoValido() {
        Presente presente = new Presente();
        presente.setNome("Camiseta sem tipo");
        presente.setAtivo(true);
        presente = presenteRepository.saveAndFlush(presente);

        ResponseEntity<PresenteAdminResponse> atualizado = rest.exchange(
                "/api/admin/presentes/" + presente.getId(),
                HttpMethod.PUT,
                new HttpEntity<>(formulario("Camiseta do herói", "ROUPA"), adminHeaders()),
                PresenteAdminResponse.class
        );

        assertThat(atualizado.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(atualizado.getBody()).isNotNull();
        assertThat(atualizado.getBody().tipo()).isEqualTo(PresenteTipo.ROUPA);
        assertThat(encontrarNaLista(presente.getId()).tipo()).isEqualTo(PresenteTipo.ROUPA);
    }

    @Test
    void rejeitaTipoInvalido() {
        ResponseEntity<ErrorResponse> resposta = rest.exchange(
                "/api/admin/presentes",
                HttpMethod.POST,
                new HttpEntity<>(formulario("Presente estranho", "COMIDA"), adminHeaders()),
                ErrorResponse.class
        );

        assertThat(resposta.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(resposta.getBody()).isNotNull();
        assertThat(resposta.getBody().message()).isEqualTo("Tipo inválido. Use BRINQUEDO, ROUPA ou SAPATOS.");
    }

    @Test
    void rejeitaTipoAusente() {
        ResponseEntity<ErrorResponse> resposta = rest.exchange(
                "/api/admin/presentes",
                HttpMethod.POST,
                new HttpEntity<>(formulario("Presente sem tipo", null), adminHeaders()),
                ErrorResponse.class
        );

        assertThat(resposta.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(resposta.getBody()).isNotNull();
        assertThat(resposta.getBody().message()).isEqualTo("Tipo é obrigatório.");
    }

    @Test
    void listaPublicaMantemPresenteAntigoSemTipo() {
        Presente presente = new Presente();
        presente.setNome("Kit legado");
        presente.setAtivo(true);
        presente = presenteRepository.saveAndFlush(presente);

        PresenteResponse listado = encontrarNaLista(presente.getId());
        assertThat(listado.tipo()).isNull();
    }

    private PresenteResponse encontrarNaLista(Long id) {
        ResponseEntity<PresenteResponse[]> lista = rest.getForEntity("/api/presentes", PresenteResponse[].class);
        assertThat(lista.getBody()).isNotNull();
        return Arrays.stream(lista.getBody())
                .filter(item -> id.equals(item.id()))
                .findFirst()
                .orElseThrow();
    }

    private MultiValueMap<String, Object> formulario(String nome, String tipo) {
        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("nome", nome);
        if (tipo != null) {
            body.add("tipo", tipo);
        }
        body.add("ativo", "true");
        return body;
    }

    private HttpHeaders adminHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.set("X-Admin-Token", "test-admin-token");
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);
        return headers;
    }
}
