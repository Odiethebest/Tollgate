package com.llmgateway.repository;

import com.llmgateway.entity.DeniedEvent;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DeniedEventRepository extends JpaRepository<DeniedEvent, Long> {
    Optional<DeniedEvent> findByRequestRequestId(Long requestId);
}
