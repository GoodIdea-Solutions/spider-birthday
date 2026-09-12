package com.aniversario.playlist.controller;

import java.util.List;

import com.aniversario.playlist.dto.MusicaPlaylistAdminResponse;
import com.aniversario.playlist.dto.MusicaPlaylistRequest;
import com.aniversario.playlist.service.PlaylistService;
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
@RequestMapping("/api/admin/playlist")
@SecurityRequirement(name = "adminToken")
public class PlaylistAdminController {

    private final PlaylistService playlistService;

    public PlaylistAdminController(PlaylistService playlistService) {
        this.playlistService = playlistService;
    }

    @GetMapping
    public List<MusicaPlaylistAdminResponse> listar() {
        return playlistService.listarAdmin();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public MusicaPlaylistAdminResponse criar(@Valid @RequestBody MusicaPlaylistRequest request) {
        return playlistService.criar(request);
    }

    @PutMapping("/{id}")
    public MusicaPlaylistAdminResponse atualizar(
            @PathVariable Long id,
            @Valid @RequestBody MusicaPlaylistRequest request
    ) {
        return playlistService.atualizar(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void excluir(@PathVariable Long id) {
        playlistService.excluir(id);
    }
}
