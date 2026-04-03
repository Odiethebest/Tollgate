package com.example.demo.repository;

import com.example.demo.entity.DeniedEvent;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DeniedEventRepository extends JpaRepository<DeniedEvent, Long> {
    Optional<DeniedEvent> findByRequestRequestId(Long requestId);
}
