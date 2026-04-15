package com.llmgateway.repository;

import com.llmgateway.entity.ApiKey;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ApiKeyRepository extends JpaRepository<ApiKey, Long> {
    Optional<ApiKey> findByKeyHash(String keyHash);

    List<ApiKey> findByLabelAndStatusOrderByCreatedAtAsc(String label, String status);

    List<ApiKey> findByProjectProjectIdOrderByKeyIdAsc(Long projectId);
}
