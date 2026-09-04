package com.aniversario.foto.controller;

import com.aniversario.config.AdminTokenInterceptor;
import com.aniversario.config.AppProperties;
import com.aniversario.exception.ApiException;
import com.aniversario.foto.dto.FotoPageResponse;
import com.aniversario.foto.dto.FotoResponse;
import com.aniversario.foto.model.FotoDestinos;
import com.aniversario.foto.model.FotoTipo;
import com.aniversario.foto.service.FotoService;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/fotos")
public class FotoController {

    private final FotoService fotoService;
    private final AppProperties appProperties;

    public FotoController(FotoService fotoService, AppProperties appProperties) {
        this.fotoService = fotoService;
        this.appProperties = appProperties;
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public FotoResponse upload(
            @RequestPart("file") MultipartFile file,
            @RequestParam(name = "destinos", required = false) FotoDestinos destinos,
            @RequestParam(name = "tipo", required = false) FotoTipo tipo
    ) {
        return fotoService.upload(file, destinos, tipo);
    }

    @GetMapping
    public FotoPageResponse listarMural(
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "12") int size
    ) {
        return fotoService.listarMural(page, size);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void excluir(
            @PathVariable Long id,
            @RequestHeader(value = AdminTokenInterceptor.ADMIN_TOKEN_HEADER, required = false) String token
    ) {
        requireAdmin(token);
        fotoService.excluir(id);
    }

    private void requireAdmin(String token) {
        if (token == null || token.isBlank() || !token.equals(appProperties.getAdminToken())) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Token de administrador inválido ou ausente.");
        }
    }
}
