package com.llmgateway.repository;

import com.llmgateway.entity.Tenant;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TenantRepository extends JpaRepository<Tenant, Long> {
    boolean existsByName(String name);
}
