package com.aniversario.presente.controller;

import java.util.List;

import com.aniversario.presente.dto.PresenteResponse;
import com.aniversario.presente.service.PresenteService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/presentes")
public class PresenteController {

    private final PresenteService presenteService;

    public PresenteController(PresenteService presenteService) {
        this.presenteService = presenteService;
    }

    @GetMapping
    public List<PresenteResponse> listar() {
        return presenteService.listarAtivos();
    }
}
