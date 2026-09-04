package com.aniversario.hq.controller;

import java.util.List;

import com.aniversario.hq.dto.HqPaginaResponse;
import com.aniversario.hq.service.HqService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/hq")
public class HqController {

    private final HqService hqService;

    public HqController(HqService hqService) {
        this.hqService = hqService;
    }

    @GetMapping
    public List<HqPaginaResponse> listar() {
        return hqService.listarPublico();
    }
}
