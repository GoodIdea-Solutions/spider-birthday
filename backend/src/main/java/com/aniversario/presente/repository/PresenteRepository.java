package com.aniversario.presente.repository;

import java.util.List;
import java.util.Optional;

import com.aniversario.presente.model.Presente;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PresenteRepository extends JpaRepository<Presente, Long> {
    List<Presente> findByAtivoTrueOrderByNomeAsc();

    List<Presente> findAllByOrderByNomeAsc();

    @Query("SELECT p FROM Presente p LEFT JOIN FETCH p.reserva ORDER BY p.nome ASC")
    List<Presente> findAllWithReservaOrderByNomeAsc();

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM Presente p WHERE p.id = :id")
    Optional<Presente> findByIdForUpdate(@Param("id") Long id);
}
