package com.aniversario.foto.controller;

import java.io.IOException;
import java.util.List;

import com.aniversario.foto.dto.DashboardResponse;
import com.aniversario.foto.dto.FotoResponse;
import com.aniversario.foto.model.Foto;
import com.aniversario.foto.service.FotoService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
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
        Resource resource = fotoService.arquivoParaDownload(id);
        String mime = foto.getMimeType() == null ? MediaType.APPLICATION_OCTET_STREAM_VALUE : foto.getMimeType();
        ResponseEntity.BodyBuilder builder = ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(mime))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + downloadFileName(foto) + "\"");
        long length = resource.contentLength();
        if (length >= 0) {
            builder.contentLength(length);
        }
        return builder.body(resource);
    }

    private static String downloadFileName(Foto foto) {
        String name = foto.getNomeArquivo();
        if (name == null || name.isBlank()) {
            return "midia-" + foto.getId();
        }
        int colon = name.indexOf(':');
        if (colon >= 0 && colon < name.length() - 1) {
            name = name.substring(colon + 1);
        }
        name = name.replace('\\', '-').replace('/', '-').replace('"', '_');
        return name.isBlank() ? "midia-" + foto.getId() : name;
    }

    @PatchMapping("/fotos/{id}/aprovar")
    public FotoResponse aprovar(@PathVariable Long id) {
        return fotoService.aprovar(id);
    }

    @PatchMapping("/fotos/{id}/rejeitar")
    public FotoResponse rejeitar(@PathVariable Long id) {
        return fotoService.rejeitar(id);
    }

    @DeleteMapping("/fotos/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void excluir(@PathVariable Long id) {
        fotoService.excluir(id);
    }
}
