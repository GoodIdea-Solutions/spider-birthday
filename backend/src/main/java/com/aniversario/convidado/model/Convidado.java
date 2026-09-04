package com.aniversario.convidado.model;

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
@Table(name = "convidados")
public class Convidado extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 120)
    private String nome;

    @Column(name = "quantidade_adultos", nullable = false)
    private Integer quantidadeAdultos;

    @Column(name = "quantidade_criancas", nullable = false)
    private Integer quantidadeCriancas;

    @Column(length = 30)
    private String telefone;

    /** Nomes dos adultos extras (além do responsável), separados por " | ". */
    @Column(name = "nomes_adultos", columnDefinition = "TEXT")
    private String nomesAdultos;

    /** Nomes das crianças, separados por " | ". */
    @Column(name = "nomes_criancas", columnDefinition = "TEXT")
    private String nomesCriancas;

    @Column(nullable = false)
    private Boolean confirmado = true;
}
