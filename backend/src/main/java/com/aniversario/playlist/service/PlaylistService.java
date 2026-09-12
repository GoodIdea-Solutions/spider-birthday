package com.aniversario.playlist.service;

import java.util.List;

import com.aniversario.exception.ApiException;
import com.aniversario.playlist.YoutubeUrlParser;
import com.aniversario.playlist.dto.MusicaPlaylistAdminResponse;
import com.aniversario.playlist.dto.MusicaPlaylistRequest;
import com.aniversario.playlist.dto.MusicaPlaylistResponse;
import com.aniversario.playlist.model.MusicaPlaylist;
import com.aniversario.playlist.repository.MusicaPlaylistRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PlaylistService {

    private final MusicaPlaylistRepository repository;

    public PlaylistService(MusicaPlaylistRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public List<MusicaPlaylistResponse> listarPublico() {
        return repository.findByAtivoTrueOrderByOrdemAscIdAsc().stream()
                .map(this::toPublicResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<MusicaPlaylistAdminResponse> listarAdmin() {
        return repository.findAllByOrderByOrdemAscIdAsc().stream()
                .map(this::toAdminResponse)
                .toList();
    }

    @Transactional
    public MusicaPlaylistAdminResponse criar(MusicaPlaylistRequest request) {
        MusicaPlaylist musica = new MusicaPlaylist();
        aplicar(musica, request);
        return toAdminResponse(repository.save(musica));
    }

    @Transactional
    public MusicaPlaylistAdminResponse atualizar(Long id, MusicaPlaylistRequest request) {
        MusicaPlaylist musica = repository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Música não encontrada."));
        aplicar(musica, request);
        return toAdminResponse(repository.save(musica));
    }

    @Transactional
    public void excluir(Long id) {
        MusicaPlaylist musica = repository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Música não encontrada."));
        repository.delete(musica);
    }

    private void aplicar(MusicaPlaylist musica, MusicaPlaylistRequest request) {
        String videoId = YoutubeUrlParser.extractVideoId(request.youtubeUrl())
                .orElseThrow(() -> new ApiException(
                        HttpStatus.BAD_REQUEST,
                        "Informe um link válido do YouTube Music ou do YouTube."
                ));

        musica.setTitulo(request.titulo().trim());
        musica.setArtista(blankToNull(request.artista()));
        musica.setYoutubeVideoId(videoId);
        musica.setYoutubeUrl(YoutubeUrlParser.toYoutubeMusicUrl(videoId));
        musica.setOrdem(request.ordem());
        musica.setAtivo(request.ativo() == null || request.ativo());
    }

    private MusicaPlaylistResponse toPublicResponse(MusicaPlaylist musica) {
        return new MusicaPlaylistResponse(
                musica.getId(),
                musica.getTitulo(),
                musica.getArtista(),
                YoutubeUrlParser.toYoutubeMusicUrl(musica.getYoutubeVideoId()),
                musica.getYoutubeVideoId(),
                musica.getOrdem()
        );
    }

    private MusicaPlaylistAdminResponse toAdminResponse(MusicaPlaylist musica) {
        String musicUrl = YoutubeUrlParser.toYoutubeMusicUrl(musica.getYoutubeVideoId());
        return new MusicaPlaylistAdminResponse(
                musica.getId(),
                musica.getTitulo(),
                musica.getArtista(),
                musica.getYoutubeUrl(),
                musicUrl,
                musica.getYoutubeVideoId(),
                musica.getOrdem(),
                Boolean.TRUE.equals(musica.getAtivo())
        );
    }

    private static String blankToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}
