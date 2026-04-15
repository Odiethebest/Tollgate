package com.llmgateway.repository;

import com.llmgateway.entity.AuditLog;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {
    Optional<AuditLog> findTopByRequestRequestIdOrderByLogIdDesc(Long requestId);
}
