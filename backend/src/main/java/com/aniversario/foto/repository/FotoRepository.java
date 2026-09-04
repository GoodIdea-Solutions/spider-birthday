package com.aniversario.foto.repository;

import java.time.Instant;
import java.util.List;

import com.aniversario.foto.model.Foto;
import com.aniversario.foto.model.FotoTipo;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FotoRepository extends JpaRepository<Foto, Long> {

    List<Foto> findByAprovadaTrueAndTipoOrderByCreatedAtDesc(FotoTipo tipo);

    List<Foto> findByAprovadaTrueAndTipoAndExpiresAtAfterOrderByCreatedAtDesc(FotoTipo tipo, Instant now);

    List<Foto> findByAprovadaTrueAndTipoAndMimeTypeStartingWithOrderByCreatedAtDesc(FotoTipo tipo, String mimePrefix);

    List<Foto> findByAprovadaFalseOrderByCreatedAtDesc();

    List<Foto> findAllByOrderByCreatedAtDesc();

    long countByAprovadaTrue();

    long countByAprovadaFalse();
}
