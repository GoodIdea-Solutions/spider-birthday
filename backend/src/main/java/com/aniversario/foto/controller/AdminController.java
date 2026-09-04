package com.aniversario.foto.controller;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

import com.aniversario.foto.dto.DashboardResponse;
import com.aniversario.foto.dto.FotoResponse;
import com.aniversario.foto.model.Foto;
import com.aniversario.foto.service.FotoService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin")
@SecurityRequirement(name = "adminToken")
public class AdminController {

    private final FotoService fotoService;

    public AdminController(FotoService fotoService) {
        this.fotoService = fotoService;
    }

    @GetMapping("/dashboard")
    public DashboardResponse dashboard() {
        return fotoService.dashboard();
    }

    @GetMapping("/fotos/pendentes")
    public List<FotoResponse> pendentes() {
        return fotoService.listarPendentes();
    }

    @GetMapping("/fotos")
    public List<FotoResponse> todas() {
        return fotoService.listarTodasAdmin();
    }

    @GetMapping("/fotos/imagens")
    public List<FotoResponse> imagensAprovadas() {
        return fotoService.listarImagensAprovadasMural();
    }

    @GetMapping("/fotos/{id}/download")
    public ResponseEntity<Resource> download(@PathVariable Long id) throws IOException {
        Foto foto = fotoService.findOrThrow(id);
        Path path = fotoService.arquivoParaDownload(id);
        Resource resource = new FileSystemResource(path);
        String mime = foto.getMimeType() == null ? MediaType.APPLICATION_OCTET_STREAM_VALUE : foto.getMimeType();
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(mime))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + foto.getNomeArquivo() + "\"")
                .contentLength(Files.size(path))
                .body(resource);
    }

    @PatchMapping("/fotos/{id}/aprovar")
    public FotoResponse aprovar(@PathVariable Long id) {
        return fotoService.aprovar(id);
    }

    @DeleteMapping("/fotos/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void excluir(@PathVariable Long id) {
        fotoService.excluir(id);
    }
}
