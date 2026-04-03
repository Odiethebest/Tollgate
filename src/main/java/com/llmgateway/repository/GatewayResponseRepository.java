package com.llmgateway.repository;

import com.llmgateway.entity.GatewayResponse;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GatewayResponseRepository extends JpaRepository<GatewayResponse, Long> {
    Optional<GatewayResponse> findByRequestRequestId(Long requestId);
}
