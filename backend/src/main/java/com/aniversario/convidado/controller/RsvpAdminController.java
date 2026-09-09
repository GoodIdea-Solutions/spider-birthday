package com.aniversario.convidado.controller;

import com.aniversario.convidado.dto.RsvpConfigResponse;
import com.aniversario.convidado.dto.RsvpConfigUpdateRequest;
import com.aniversario.convidado.dto.RsvpResponse;
import com.aniversario.convidado.dto.RsvpUpdateRequest;
import com.aniversario.convidado.service.ConvidadoService;
import com.aniversario.convidado.service.RsvpConfigService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/rsvp")
@SecurityRequirement(name = "adminToken")
public class RsvpAdminController {

    private final ConvidadoService convidadoService;
    private final RsvpConfigService rsvpConfigService;

    public RsvpAdminController(ConvidadoService convidadoService, RsvpConfigService rsvpConfigService) {
        this.convidadoService = convidadoService;
        this.rsvpConfigService = rsvpConfigService;
    }

    @GetMapping("/config")
    public RsvpConfigResponse obterConfig() {
        return rsvpConfigService.obter();
    }

    @PutMapping("/config")
    public RsvpConfigResponse atualizarConfig(@Valid @RequestBody RsvpConfigUpdateRequest request) {
        return rsvpConfigService.atualizar(request);
    }

    @PutMapping("/{id:\\d+}")
    public RsvpResponse atualizar(@PathVariable Long id, @Valid @RequestBody RsvpUpdateRequest request) {
        return convidadoService.atualizar(id, request);
    }

    @DeleteMapping("/{id:\\d+}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void excluir(@PathVariable Long id) {
        convidadoService.excluir(id);
    }
}
