package com.aniversario.hq.controller;

import java.util.List;

import com.aniversario.hq.dto.HqPaginaRequest;
import com.aniversario.hq.dto.HqPaginaResponse;
import com.aniversario.hq.service.HqService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/hq/paginas")
@SecurityRequirement(name = "adminToken")
public class HqAdminController {

    private final HqService hqService;

    public HqAdminController(HqService hqService) {
        this.hqService = hqService;
    }

    @GetMapping
    public List<HqPaginaResponse> listar() {
        return hqService.listarAdmin();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public HqPaginaResponse criar(@Valid @RequestBody HqPaginaRequest request) {
        return hqService.criar(request);
    }

    @PutMapping("/{id}")
    public HqPaginaResponse atualizar(@PathVariable Long id, @Valid @RequestBody HqPaginaRequest request) {
        return hqService.atualizar(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void excluir(@PathVariable Long id) {
        hqService.excluir(id);
    }
}
