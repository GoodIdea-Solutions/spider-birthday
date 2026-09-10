package com.aniversario.presente.controller;

import com.aniversario.presente.dto.ReservaConsultaResponse;
import com.aniversario.presente.dto.ReservaRequest;
import com.aniversario.presente.dto.ReservaResponse;
import com.aniversario.presente.service.ReservaPresenteService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class ReservaPresenteController {

    private final ReservaPresenteService reservaPresenteService;

    public ReservaPresenteController(ReservaPresenteService reservaPresenteService) {
        this.reservaPresenteService = reservaPresenteService;
    }

    @PostMapping("/presentes/{id}/reservar")
    @ResponseStatus(HttpStatus.CREATED)
    public ReservaResponse reservar(@PathVariable Long id, @Valid @RequestBody ReservaRequest request) {
        return reservaPresenteService.reservar(id, request);
    }

    @GetMapping("/reservas/{token}")
    public ReservaConsultaResponse consultar(@PathVariable String token) {
        return reservaPresenteService.consultar(token);
    }
}
