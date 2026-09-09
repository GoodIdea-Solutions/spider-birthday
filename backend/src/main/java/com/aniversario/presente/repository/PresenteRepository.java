package com.aniversario.presente.repository;

import java.util.List;

import com.aniversario.presente.model.Presente;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PresenteRepository extends JpaRepository<Presente, Long> {
    List<Presente> findByAtivoTrueOrderByNomeAsc();

    List<Presente> findAllByOrderByNomeAsc();
}
