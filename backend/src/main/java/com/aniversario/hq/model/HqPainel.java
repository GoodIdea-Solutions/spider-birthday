package com.aniversario.hq.model;

import com.aniversario.common.AuditableEntity;
import com.aniversario.foto.model.Foto;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "hq_paineis")
public class HqPainel extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "pagina_id", nullable = false)
    private HqPagina pagina;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "foto_id", nullable = false)
    private Foto foto;

    @Column(nullable = false)
    private Integer ordem = 0;

    @Column(nullable = false)
    private Integer posicao = 1;

    @Column(length = 280)
    private String legenda;
}
