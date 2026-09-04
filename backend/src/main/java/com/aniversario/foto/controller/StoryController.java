package com.aniversario.foto.controller;

import java.util.List;

import com.aniversario.foto.dto.FotoResponse;
import com.aniversario.foto.service.FotoService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/stories")
public class StoryController {

    private final FotoService fotoService;

    public StoryController(FotoService fotoService) {
        this.fotoService = fotoService;
    }

    @GetMapping
    public List<FotoResponse> listarAtivos() {
        return fotoService.listarStoriesAtivos();
    }
}
