package com.aniversario.foto.model;

import java.time.Instant;

import com.aniversario.common.AuditableEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "fotos")
public class Foto extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "nome_arquivo", nullable = false, length = 255)
    private String nomeArquivo;

    @Column(nullable = false, length = 500)
    private String url;

    @Column(nullable = false)
    private Boolean aprovada = false;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private FotoTipo tipo = FotoTipo.MURAL;

    @Column(name = "mime_type", length = 80)
    private String mimeType;

    @Column(name = "expires_at")
    private Instant expiresAt;
}
