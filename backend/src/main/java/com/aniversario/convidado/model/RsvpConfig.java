package com.aniversario.convidado.model;

import java.time.LocalDate;

import com.aniversario.common.AuditableEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "rsvp_config")
public class RsvpConfig extends AuditableEntity {

    public static final long SINGLETON_ID = 1L;

    @Id
    private Long id = SINGLETON_ID;

    @Column(name = "confirmacao_liberada", nullable = false)
    private Boolean confirmacaoLiberada = true;

    @Column(name = "prazo_confirmacao")
    private LocalDate prazoConfirmacao;
}
