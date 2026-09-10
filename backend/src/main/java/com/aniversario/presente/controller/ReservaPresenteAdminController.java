package com.aniversario.presente.controller;

import com.aniversario.presente.service.ReservaPresenteService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/reservas")
@SecurityRequirement(name = "adminToken")
public class ReservaPresenteAdminController {

    private final ReservaPresenteService reservaPresenteService;

    public ReservaPresenteAdminController(ReservaPresenteService reservaPresenteService) {
        this.reservaPresenteService = reservaPresenteService;
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void cancelar(@PathVariable Long id) {
        reservaPresenteService.cancelar(id);
    }
}
