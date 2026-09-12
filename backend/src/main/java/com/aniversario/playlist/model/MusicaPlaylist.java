package com.aniversario.playlist.model;

import com.aniversario.common.AuditableEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "playlist_musicas")
public class MusicaPlaylist extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 150)
    private String titulo;

    @Column(length = 120)
    private String artista;

    @Column(name = "youtube_url", nullable = false, length = 2000)
    private String youtubeUrl;

    @Column(name = "youtube_video_id", nullable = false, length = 11)
    private String youtubeVideoId;

    @Column(nullable = false)
    private Integer ordem = 0;

    @Column(nullable = false)
    private Boolean ativo = true;
}
