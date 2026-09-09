package com.aniversario.convidado.repository;

import com.aniversario.convidado.model.RsvpConfig;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RsvpConfigRepository extends JpaRepository<RsvpConfig, Long> {
}
