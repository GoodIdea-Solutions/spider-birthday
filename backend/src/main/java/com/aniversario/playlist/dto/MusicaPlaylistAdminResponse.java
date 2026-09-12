package com.aniversario.playlist.dto;

public record MusicaPlaylistAdminResponse(
        Long id,
        String titulo,
        String artista,
        String youtubeUrl,
        String youtubeMusicUrl,
        String youtubeVideoId,
        int ordem,
        boolean ativo
) {
}
