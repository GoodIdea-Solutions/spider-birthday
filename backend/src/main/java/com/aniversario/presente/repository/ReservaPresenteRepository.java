package com.aniversario.presente.repository;

import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import com.aniversario.presente.model.ReservaPresente;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ReservaPresenteRepository extends JpaRepository<ReservaPresente, Long> {

    boolean existsByPresenteId(Long presenteId);

    Optional<ReservaPresente> findByPresenteId(Long presenteId);

    @Query("SELECT r FROM ReservaPresente r JOIN FETCH r.presente WHERE r.token = :token")
    Optional<ReservaPresente> findByToken(@Param("token") UUID token);

    @Query("SELECT r.presente.id FROM ReservaPresente r")
    Set<Long> findAllPresenteIds();
}
