package com.example.demo.repository;

import com.example.demo.entity.GatewayResponse;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GatewayResponseRepository extends JpaRepository<GatewayResponse, Long> {
    Optional<GatewayResponse> findByRequestRequestId(Long requestId);
}
