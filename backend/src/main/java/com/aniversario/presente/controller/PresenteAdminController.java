package com.aniversario.presente.controller;

import java.util.List;

import com.aniversario.presente.dto.PresenteAdminResponse;
import com.aniversario.presente.service.PresenteService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/admin/presentes")
@SecurityRequirement(name = "adminToken")
public class PresenteAdminController {

    private final PresenteService presenteService;

    public PresenteAdminController(PresenteService presenteService) {
        this.presenteService = presenteService;
    }

    @GetMapping
    public List<PresenteAdminResponse> listar() {
        return presenteService.listarAdmin();
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public PresenteAdminResponse criar(
            @RequestParam("nome") String nome,
            @RequestParam(value = "descricao", required = false) String descricao,
            @RequestParam(value = "link", required = false) String link,
            @RequestParam(value = "preco", required = false) String preco,
            @RequestParam(value = "ativo", required = false) Boolean ativo,
            @RequestParam(value = "imagemUrl", required = false) String imagemUrl,
            @RequestPart(value = "file", required = false) MultipartFile file
    ) {
        return presenteService.criar(nome, descricao, link, preco, ativo, imagemUrl, file);
    }

    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public PresenteAdminResponse atualizar(
            @PathVariable Long id,
            @RequestParam("nome") String nome,
            @RequestParam(value = "descricao", required = false) String descricao,
            @RequestParam(value = "link", required = false) String link,
            @RequestParam(value = "preco", required = false) String preco,
            @RequestParam(value = "ativo", required = false) Boolean ativo,
            @RequestParam(value = "imagemUrl", required = false) String imagemUrl,
            @RequestPart(value = "file", required = false) MultipartFile file
    ) {
        return presenteService.atualizar(id, nome, descricao, link, preco, ativo, imagemUrl, file);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void excluir(@PathVariable Long id) {
        presenteService.excluir(id);
    }
}
