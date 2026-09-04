package com.aniversario.foto.repository;

import java.time.Instant;
import java.util.List;

import com.aniversario.foto.model.Foto;
import com.aniversario.foto.model.FotoStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface FotoRepository extends JpaRepository<Foto, Long> {

    List<Foto> findByStatusOrderByCreatedAtDesc(FotoStatus status);

    List<Foto> findAllByOrderByCreatedAtDesc();

    long countByStatus(FotoStatus status);

    @Query("""
            SELECT f FROM Foto f
            WHERE f.status = com.aniversario.foto.model.FotoStatus.APROVADA
              AND EXISTS (
                  SELECT 1 FROM FotoPublicacao p
                  WHERE p.foto = f
                    AND p.destino = com.aniversario.foto.model.FotoTipo.MURAL
                    AND p.status = com.aniversario.foto.model.FotoPublicacaoStatus.ATIVO
              )
            """)
    Page<Foto> findMuralPublicado(Pageable pageable);

    @Query("""
            SELECT COUNT(f) FROM Foto f
            WHERE f.status = com.aniversario.foto.model.FotoStatus.APROVADA
              AND EXISTS (
                  SELECT 1 FROM FotoPublicacao p
                  WHERE p.foto = f
                    AND p.destino = com.aniversario.foto.model.FotoTipo.MURAL
                    AND p.status = com.aniversario.foto.model.FotoPublicacaoStatus.ATIVO
              )
            """)
    long countMuralPublicado();

    @Query("""
            SELECT f FROM Foto f
            WHERE f.status = com.aniversario.foto.model.FotoStatus.APROVADA
              AND EXISTS (
                  SELECT 1 FROM FotoPublicacao p
                  WHERE p.foto = f
                    AND p.destino = com.aniversario.foto.model.FotoTipo.STORY
                    AND p.status = com.aniversario.foto.model.FotoPublicacaoStatus.ATIVO
                    AND (p.expiresAt IS NULL OR p.expiresAt > :now)
              )
            ORDER BY f.createdAt DESC
            """)
    List<Foto> findStoriesAtivos(@Param("now") Instant now);

    @Query("""
            SELECT COUNT(f) FROM Foto f
            WHERE f.status = com.aniversario.foto.model.FotoStatus.APROVADA
              AND EXISTS (
                  SELECT 1 FROM FotoPublicacao p
                  WHERE p.foto = f
                    AND p.destino = com.aniversario.foto.model.FotoTipo.STORY
                    AND p.status = com.aniversario.foto.model.FotoPublicacaoStatus.ATIVO
                    AND (p.expiresAt IS NULL OR p.expiresAt > :now)
              )
            """)
    long countStoriesAtivos(@Param("now") Instant now);

    @Query("""
            SELECT f FROM Foto f
            WHERE f.status = com.aniversario.foto.model.FotoStatus.APROVADA
              AND f.mimeType LIKE 'image/%'
              AND EXISTS (
                  SELECT 1 FROM FotoPublicacao p
                  WHERE p.foto = f
                    AND p.destino = com.aniversario.foto.model.FotoTipo.MURAL
                    AND p.status = com.aniversario.foto.model.FotoPublicacaoStatus.ATIVO
              )
            ORDER BY f.createdAt DESC
            """)
    List<Foto> findImagensMuralAprovadas();
}
