package com.aniversario.convidado.repository;

import com.aniversario.convidado.model.Convidado;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface ConvidadoRepository extends JpaRepository<Convidado, Long> {

    java.util.List<Convidado> findByConfirmadoTrue();


    @Query("select coalesce(sum(c.quantidadeAdultos), 0) from Convidado c")
    long sumAdultos();

    @Query("select coalesce(sum(c.quantidadeCriancas), 0) from Convidado c")
    long sumCriancas();
}
