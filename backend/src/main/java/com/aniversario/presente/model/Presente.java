package com.aniversario.presente.model;

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
@Table(name = "presentes")
public class Presente extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 150)
    private String nome;

    @Column(length = 500)
    private String descricao;

    @Column(name = "imagem_url", length = 2000)
    private String imagemUrl;

    @Column(name = "imagem_arquivo", length = 255)
    private String imagemArquivo;

    @Column(length = 2000)
    private String link;

    @Column(nullable = false)
    private Boolean ativo = true;
}
