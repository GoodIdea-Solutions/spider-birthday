package com.aniversario.convidado.service;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

import com.aniversario.convidado.dto.RsvpPublicResponse;
import com.aniversario.convidado.dto.RsvpRequest;
import com.aniversario.convidado.dto.RsvpResponse;
import com.aniversario.convidado.dto.RsvpUpdateRequest;
import com.aniversario.convidado.model.Convidado;
import com.aniversario.convidado.repository.ConvidadoRepository;
import com.aniversario.exception.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ConvidadoService {

    private static final String SEPARADOR = " | ";
    private static final int IDADE_MIN = 0;
    private static final int IDADE_MAX = 17;

    private final ConvidadoRepository convidadoRepository;

    public ConvidadoService(ConvidadoRepository convidadoRepository) {
        this.convidadoRepository = convidadoRepository;
    }

    @Transactional
    public RsvpResponse confirmar(RsvpRequest request) {
        validarQuantidades(request.quantidadeAdultos(), request.quantidadeCriancas());
        List<String> nomesAdultos = normalizarLista(request.nomesAdultos());
        List<String> nomesCriancas = normalizarLista(request.nomesCriancas());
        List<Integer> idadesCriancas = normalizarIdades(request.idadesCriancas());
        validarNomes(request.quantidadeAdultos(), request.quantidadeCriancas(), nomesAdultos, nomesCriancas);
        validarIdades(request.quantidadeCriancas(), idadesCriancas);

        Convidado convidado = new Convidado();
        aplicarDados(
                convidado,
                request.nome(),
                request.quantidadeAdultos(),
                request.quantidadeCriancas(),
                request.telefone(),
                nomesAdultos,
                nomesCriancas,
                idadesCriancas
        );
        convidado.setConfirmado(true);

        return toResponse(convidadoRepository.save(convidado));
    }

    @Transactional
    public RsvpResponse atualizar(Long id, RsvpUpdateRequest request) {
        validarQuantidades(request.quantidadeAdultos(), request.quantidadeCriancas());
        List<String> nomesAdultos = normalizarLista(request.nomesAdultos());
        List<String> nomesCriancas = normalizarLista(request.nomesCriancas());
        List<Integer> idadesCriancas = normalizarIdades(request.idadesCriancas());
        validarNomes(request.quantidadeAdultos(), request.quantidadeCriancas(), nomesAdultos, nomesCriancas);
        validarIdades(request.quantidadeCriancas(), idadesCriancas);

        Convidado convidado = findOrThrow(id);
        aplicarDados(
                convidado,
                request.nome(),
                request.quantidadeAdultos(),
                request.quantidadeCriancas(),
                request.telefone(),
                nomesAdultos,
                nomesCriancas,
                idadesCriancas
        );

        return toResponse(convidadoRepository.save(convidado));
    }

    @Transactional
    public void excluir(Long id) {
        Convidado convidado = findOrThrow(id);
        convidadoRepository.delete(convidado);
    }

    @Transactional(readOnly = true)
    public List<RsvpResponse> listar() {
        return convidadoRepository.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<RsvpPublicResponse> listarConfirmados() {
        return convidadoRepository.findByConfirmadoTrue().stream()
                .map(c -> new RsvpPublicResponse(
                        c.getNome(),
                        c.getQuantidadeAdultos(),
                        c.getQuantidadeCriancas(),
                        desserializar(c.getNomesAdultos()),
                        desserializar(c.getNomesCriancas()),
                        desserializarIdades(c.getIdadesCriancas())
                ))
                .toList();
    }

    private Convidado findOrThrow(Long id) {
        return convidadoRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Convidado não encontrado."));
    }

    private void validarQuantidades(int adultos, int criancas) {
        if (adultos + criancas < 1) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Informe ao menos 1 adulto ou 1 criança.");
        }
    }

    private void validarNomes(
            int quantidadeAdultos,
            int quantidadeCriancas,
            List<String> nomesAdultos,
            List<String> nomesCriancas
    ) {
        int extrasEsperados = quantidadeAdultos > 1 ? quantidadeAdultos - 1 : 0;
        if (nomesAdultos.size() != extrasEsperados) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    extrasEsperados == 0
                            ? "Não informe nomes de adultos extras quando há no máximo 1 adulto."
                            : "Informe o nome de cada adulto adicional (" + extrasEsperados + ")."
            );
        }
        if (nomesAdultos.stream().anyMatch(String::isBlank)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Todos os nomes de adultos devem ser preenchidos.");
        }

        if (nomesCriancas.size() != quantidadeCriancas) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    quantidadeCriancas == 0
                            ? "Não informe nomes de crianças quando a quantidade é zero."
                            : "Informe o nome de cada criança (" + quantidadeCriancas + ")."
            );
        }
        if (nomesCriancas.stream().anyMatch(String::isBlank)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Todos os nomes de crianças devem ser preenchidos.");
        }
    }

    private void validarIdades(int quantidadeCriancas, List<Integer> idadesCriancas) {
        if (idadesCriancas.size() != quantidadeCriancas) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    quantidadeCriancas == 0
                            ? "Não informe idades de crianças quando a quantidade é zero."
                            : "Informe a idade de cada criança (" + quantidadeCriancas + ")."
            );
        }
        if (idadesCriancas.stream().anyMatch(idade -> idade == null || idade < IDADE_MIN || idade > IDADE_MAX)) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "Informe a idade de cada criança (0 a 17 anos)."
            );
        }
    }

    private List<String> normalizarLista(List<String> nomes) {
        if (nomes == null || nomes.isEmpty()) {
            return List.of();
        }
        return nomes.stream()
                .map(n -> n == null ? "" : n.trim())
                .toList();
    }

    private List<Integer> normalizarIdades(List<Integer> idades) {
        if (idades == null || idades.isEmpty()) {
            return List.of();
        }
        return List.copyOf(idades);
    }

    private void aplicarDados(
            Convidado convidado,
            String nome,
            Integer quantidadeAdultos,
            Integer quantidadeCriancas,
            String telefone,
            List<String> nomesAdultos,
            List<String> nomesCriancas,
            List<Integer> idadesCriancas
    ) {
        convidado.setNome(nome.trim());
        convidado.setQuantidadeAdultos(quantidadeAdultos);
        convidado.setQuantidadeCriancas(quantidadeCriancas);
        convidado.setTelefone(telefone == null || telefone.isBlank() ? null : telefone.trim());
        convidado.setNomesAdultos(serializar(nomesAdultos));
        convidado.setNomesCriancas(serializar(nomesCriancas));
        convidado.setIdadesCriancas(serializarIdades(idadesCriancas));
    }

    static String serializar(List<String> nomes) {
        if (nomes == null || nomes.isEmpty()) {
            return null;
        }
        return nomes.stream()
                .map(String::trim)
                .filter(n -> !n.isEmpty())
                .collect(Collectors.joining(SEPARADOR));
    }

    static List<String> desserializar(String valor) {
        if (valor == null || valor.isBlank()) {
            return Collections.emptyList();
        }
        return Arrays.stream(valor.split("\\s*\\|\\s*"))
                .map(String::trim)
                .filter(n -> !n.isEmpty())
                .toList();
    }

    static String serializarIdades(List<Integer> idades) {
        if (idades == null || idades.isEmpty()) {
            return null;
        }
        return idades.stream()
                .map(String::valueOf)
                .collect(Collectors.joining(SEPARADOR));
    }

    static List<Integer> desserializarIdades(String valor) {
        if (valor == null || valor.isBlank()) {
            return Collections.emptyList();
        }
        return Arrays.stream(valor.split("\\s*\\|\\s*"))
                .map(String::trim)
                .filter(n -> !n.isEmpty())
                .map(Integer::valueOf)
                .toList();
    }

    private RsvpResponse toResponse(Convidado convidado) {
        return new RsvpResponse(
                convidado.getId(),
                convidado.getNome(),
                convidado.getQuantidadeAdultos(),
                convidado.getQuantidadeCriancas(),
                convidado.getTelefone(),
                desserializar(convidado.getNomesAdultos()),
                desserializar(convidado.getNomesCriancas()),
                desserializarIdades(convidado.getIdadesCriancas()),
                convidado.getConfirmado(),
                convidado.getCreatedAt()
        );
    }
}
