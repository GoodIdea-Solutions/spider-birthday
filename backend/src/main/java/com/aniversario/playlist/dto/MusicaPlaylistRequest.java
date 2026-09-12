package com.aniversario.playlist.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record MusicaPlaylistRequest(
        @NotBlank
        @Size(max = 150)
        String titulo,

        @Size(max = 120)
        String artista,

        @NotBlank
        @Size(max = 2000)
        String youtubeUrl,

        @NotNull
        @Min(0)
        Integer ordem,

        Boolean ativo
) {
}
