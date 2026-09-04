package com.aniversario.foto.model;

import java.time.Instant;

import com.aniversario.common.AuditableEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(
        name = "foto_publicacoes",
        uniqueConstraints = @UniqueConstraint(name = "uk_foto_publicacao_destino", columnNames = {"foto_id", "destino"})
)
public class FotoPublicacao extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "foto_id", nullable = false)
    private Foto foto;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private FotoTipo destino;

    @Column(name = "publicado_em", nullable = false)
    private Instant publicadoEm;

    @Column(name = "expires_at")
    private Instant expiresAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private FotoPublicacaoStatus status = FotoPublicacaoStatus.ATIVO;
}
