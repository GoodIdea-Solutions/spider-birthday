package com.aniversario.playlist.dto;

public record MusicaPlaylistResponse(
        Long id,
        String titulo,
        String artista,
        String youtubeMusicUrl,
        String youtubeVideoId,
        int ordem
) {
}
