package com.aniversario.playlist.controller;

import java.util.List;

import com.aniversario.playlist.dto.MusicaPlaylistResponse;
import com.aniversario.playlist.service.PlaylistService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/playlist")
public class PlaylistController {

    private final PlaylistService playlistService;

    public PlaylistController(PlaylistService playlistService) {
        this.playlistService = playlistService;
    }

    @GetMapping
    public List<MusicaPlaylistResponse> listar() {
        return playlistService.listarPublico();
    }
}
