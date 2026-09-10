package com.aniversario.presente;

import java.util.Arrays;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import com.aniversario.exception.ErrorResponse;
import com.aniversario.presente.dto.PresenteAdminResponse;
import com.aniversario.presente.dto.PresenteResponse;
import com.aniversario.presente.dto.ReservaConsultaResponse;
import com.aniversario.presente.dto.ReservaResponse;
import com.aniversario.presente.model.Presente;
import com.aniversario.presente.repository.PresenteRepository;
import com.aniversario.presente.service.ReservaPresenteService;
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
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
@ActiveProfiles("test")
class ReservaPresenteTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @Autowired
    private TestRestTemplate rest;

    @Autowired
    private PresenteRepository presenteRepository;

    @Test
    void reservaPresenteDisponivel() {
        Presente presente = criarPresente("Carrinho de testes", true);

        ResponseEntity<ReservaResponse> created = rest.postForEntity(
                "/api/presentes/" + presente.getId() + "/reservar",
                payload("Miles Morales", "11988887777"),
                ReservaResponse.class
        );

        assertThat(created.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(created.getBody()).isNotNull();
        assertThat(created.getBody().presenteId()).isEqualTo(presente.getId());
        assertThat(created.getBody().nomeConvidado()).isEqualTo("Miles Morales");
        assertThat(created.getBody().token()).isNotNull();

        PresenteResponse listado = encontrarNaLista(presente.getId());
        assertThat(listado.reservado()).isTrue();

        ResponseEntity<String> publico = rest.getForEntity("/api/presentes", String.class);
        assertThat(publico.getBody()).doesNotContain("Miles Morales");
        assertThat(publico.getBody()).doesNotContain("11988887777");
        assertThat(publico.getBody()).doesNotContain("nomeConvidado");
    }

    @Test
    void tentaReservarPresenteJaReservado() {
        Presente presente = criarPresente("Livro já escolhido", true);
        ResponseEntity<ReservaResponse> primeira = rest.postForEntity(
                "/api/presentes/" + presente.getId() + "/reservar",
                payload("Peter Parker", null),
                ReservaResponse.class
        );
        assertThat(primeira.getStatusCode()).isEqualTo(HttpStatus.CREATED);

        ResponseEntity<ErrorResponse> segunda = rest.postForEntity(
                "/api/presentes/" + presente.getId() + "/reservar",
                payload("Gwen Stacy", null),
                ErrorResponse.class
        );

        assertThat(segunda.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(segunda.getBody()).isNotNull();
        assertThat(segunda.getBody().message()).isEqualTo(ReservaPresenteService.PRESENTE_JA_RESERVADO);
    }

    @Test
    void tentaReservarPresenteInexistente() {
        ResponseEntity<ErrorResponse> resposta = rest.postForEntity(
                "/api/presentes/999999/reservar",
                payload("Novo herói", null),
                ErrorResponse.class
        );
        assertThat(resposta.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void tentaReservarPresenteInativo() {
        Presente presente = criarPresente("Presente oculto", false);
        ResponseEntity<ErrorResponse> resposta = rest.postForEntity(
                "/api/presentes/" + presente.getId() + "/reservar",
                payload("Novo herói", null),
                ErrorResponse.class
        );
        assertThat(resposta.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void cancelaReservaELiberaPresente() {
        Presente presente = criarPresente("Kit para cancelar", true);
        ResponseEntity<ReservaResponse> created = rest.postForEntity(
                "/api/presentes/" + presente.getId() + "/reservar",
                payload("Tia May", "1133334444"),
                ReservaResponse.class
        );
        assertThat(created.getStatusCode()).isEqualTo(HttpStatus.CREATED);

        PresenteAdminResponse adminItem = encontrarNoAdmin(presente.getId());
        assertThat(adminItem.reservado()).isTrue();
        assertThat(adminItem.reserva()).isNotNull();
        assertThat(adminItem.reserva().nomeConvidado()).isEqualTo("Tia May");
        assertThat(adminItem.reserva().telefone()).isEqualTo("1133334444");

        ResponseEntity<Void> cancelado = rest.exchange(
                "/api/admin/reservas/" + adminItem.reserva().id(),
                HttpMethod.DELETE,
                new HttpEntity<>(adminHeaders()),
                Void.class
        );
        assertThat(cancelado.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        assertThat(encontrarNaLista(presente.getId()).reservado()).isFalse();

        ResponseEntity<ReservaResponse> deNovo = rest.postForEntity(
                "/api/presentes/" + presente.getId() + "/reservar",
                payload("Harry Osborn", null),
                ReservaResponse.class
        );
        assertThat(deNovo.getStatusCode()).isEqualTo(HttpStatus.CREATED);
    }

    @Test
    void consultaReservaPorToken() {
        Presente presente = criarPresente("Consulta por token", true);
        ReservaResponse created = rest.postForEntity(
                "/api/presentes/" + presente.getId() + "/reservar",
                payload("Mary Jane", "11911112222"),
                ReservaResponse.class
        ).getBody();
        assertThat(created).isNotNull();

        ResponseEntity<ReservaConsultaResponse> consulta = rest.getForEntity(
                "/api/reservas/" + created.token(),
                ReservaConsultaResponse.class
        );
        assertThat(consulta.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(consulta.getBody()).isNotNull();
        assertThat(consulta.getBody().nomeConvidado()).isEqualTo("Mary Jane");
        assertThat(consulta.getBody().telefone()).isEqualTo("11911112222");
        assertThat(consulta.getBody().presenteNome()).isEqualTo("Consulta por token");

        ResponseEntity<ErrorResponse> invalido = rest.getForEntity("/api/reservas/nao-e-uuid", ErrorResponse.class);
        assertThat(invalido.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);

        ResponseEntity<ErrorResponse> outro = rest.getForEntity(
                "/api/reservas/" + UUID.randomUUID(),
                ErrorResponse.class
        );
        assertThat(outro.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void duasReservasSimultaneasApenasUmaVence() throws Exception {
        Presente presente = criarPresente("Corrida de heróis", true);
        ExecutorService pool = Executors.newFixedThreadPool(2);
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(2);
        AtomicInteger created = new AtomicInteger();
        AtomicInteger conflicts = new AtomicInteger();

        for (int i = 0; i < 2; i++) {
            String nome = i == 0 ? "Herói Um" : "Herói Dois";
            pool.submit(() -> {
                try {
                    start.await(5, TimeUnit.SECONDS);
                    ResponseEntity<String> resposta = rest.postForEntity(
                            "/api/presentes/" + presente.getId() + "/reservar",
                            payload(nome, null),
                            String.class
                    );
                    if (resposta.getStatusCode() == HttpStatus.CREATED) {
                        created.incrementAndGet();
                    } else if (resposta.getStatusCode() == HttpStatus.CONFLICT) {
                        conflicts.incrementAndGet();
                    }
                } catch (Exception ignored) {
                    // a falha aparece nas asserções abaixo
                } finally {
                    done.countDown();
                }
            });
        }

        start.countDown();
        assertThat(done.await(20, TimeUnit.SECONDS)).isTrue();
        pool.shutdownNow();

        assertThat(created.get()).isEqualTo(1);
        assertThat(conflicts.get()).isEqualTo(1);
        assertThat(encontrarNaLista(presente.getId()).reservado()).isTrue();
    }

    private Presente criarPresente(String nome, boolean ativo) {
        Presente presente = new Presente();
        presente.setNome(nome);
        presente.setAtivo(ativo);
        return presenteRepository.saveAndFlush(presente);
    }

    private PresenteResponse encontrarNaLista(Long id) {
        ResponseEntity<PresenteResponse[]> lista = rest.getForEntity("/api/presentes", PresenteResponse[].class);
        assertThat(lista.getBody()).isNotNull();
        return Arrays.stream(lista.getBody())
                .filter(item -> id.equals(item.id()))
                .findFirst()
                .orElseThrow();
    }

    private PresenteAdminResponse encontrarNoAdmin(Long id) {
        ResponseEntity<PresenteAdminResponse[]> lista = rest.exchange(
                "/api/admin/presentes",
                HttpMethod.GET,
                new HttpEntity<>(adminHeaders()),
                PresenteAdminResponse[].class
        );
        assertThat(lista.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(lista.getBody()).isNotNull();
        return Arrays.stream(lista.getBody())
                .filter(item -> id.equals(item.id()))
                .findFirst()
                .orElseThrow();
    }

    private HttpHeaders adminHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.set("X-Admin-Token", "test-admin-token");
        return headers;
    }

    private HttpEntity<Map<String, String>> payload(String nome, String telefone) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        if (telefone == null) {
            return new HttpEntity<>(Map.of("nomeConvidado", nome), headers);
        }
        return new HttpEntity<>(Map.of("nomeConvidado", nome, "telefone", telefone), headers);
    }
}
