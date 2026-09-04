package com.aniversario.foto.model;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import com.aniversario.common.AuditableEntity;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
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

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private FotoStatus status = FotoStatus.PENDENTE;

    @Enumerated(EnumType.STRING)
    @Column(name = "destinos_solicitados", nullable = false, length = 20)
    private FotoDestinos destinosSolicitados = FotoDestinos.MURAL;

    @Column(name = "mime_type", length = 80)
    private String mimeType;

    @Column(name = "expires_at")
    private Instant expiresAt;

    @Column(length = 80)
    private String filtro;

    @OneToMany(mappedBy = "foto", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<FotoPublicacao> publicacoes = new ArrayList<>();

    public void addPublicacao(FotoPublicacao publicacao) {
        publicacoes.add(publicacao);
        publicacao.setFoto(this);
    }
}
