package com.aniversario.foto.repository;

import java.util.Optional;

import com.aniversario.foto.model.FotoPublicacao;
import com.aniversario.foto.model.FotoTipo;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FotoPublicacaoRepository extends JpaRepository<FotoPublicacao, Long> {

    Optional<FotoPublicacao> findByFotoIdAndDestino(Long fotoId, FotoTipo destino);
}
