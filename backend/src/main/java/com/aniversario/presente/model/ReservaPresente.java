package com.aniversario.presente.model;

import java.util.UUID;

import com.aniversario.common.AuditableEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "reservas_presente")
public class ReservaPresente extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "presente_id", nullable = false, unique = true)
    private Presente presente;

    @Column(name = "nome_convidado", nullable = false, length = 120)
    private String nomeConvidado;

    @Column(length = 30)
    private String telefone;

    @Column(nullable = false, unique = true, updatable = false)
    private UUID token;
}
