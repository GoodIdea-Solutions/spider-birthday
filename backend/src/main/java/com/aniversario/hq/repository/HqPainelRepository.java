package com.aniversario.hq.repository;

import com.aniversario.hq.model.HqPainel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface HqPainelRepository extends JpaRepository<HqPainel, Long> {

    @Query("select (count(p) > 0) from HqPainel p where p.foto.id = :fotoId")
    boolean existsByFotoId(Long fotoId);
}
