package com.aniversario.playlist.repository;

import java.util.List;

import com.aniversario.playlist.model.MusicaPlaylist;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MusicaPlaylistRepository extends JpaRepository<MusicaPlaylist, Long> {

    List<MusicaPlaylist> findByAtivoTrueOrderByOrdemAscIdAsc();

    List<MusicaPlaylist> findAllByOrderByOrdemAscIdAsc();
}
