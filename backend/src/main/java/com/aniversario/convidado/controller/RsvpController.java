package com.aniversario.convidado.controller;

import java.util.List;

import com.aniversario.convidado.dto.RsvpPublicResponse;
import com.aniversario.convidado.dto.RsvpRequest;
import com.aniversario.convidado.dto.RsvpResponse;
import com.aniversario.convidado.service.ConvidadoService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/rsvp")
public class RsvpController {

    private final ConvidadoService convidadoService;

    public RsvpController(ConvidadoService convidadoService) {
        this.convidadoService = convidadoService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public RsvpResponse confirmar(@Valid @RequestBody RsvpRequest request) {
        return convidadoService.confirmar(request);
    }

    @GetMapping
    public List<RsvpResponse> listar() {
        return convidadoService.listar();
    }

    @GetMapping("/confirmados")
    public List<RsvpPublicResponse> listarConfirmados() {
        return convidadoService.listarConfirmados();
    }
}
