package com.aniversario.hq.repository;

import java.util.List;
import java.util.Optional;

import com.aniversario.hq.model.HqPagina;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface HqPaginaRepository extends JpaRepository<HqPagina, Long> {

    @Query("select distinct p from HqPagina p left join fetch p.paineis pn left join fetch pn.foto order by p.ordem")
    List<HqPagina> findAllWithPaineis();

    @Query("select distinct p from HqPagina p left join fetch p.paineis pn left join fetch pn.foto where p.id = :id")
    Optional<HqPagina> findByIdWithPaineis(Long id);
}
