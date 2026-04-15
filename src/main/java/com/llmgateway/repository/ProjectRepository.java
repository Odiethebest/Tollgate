package com.llmgateway.repository;

import com.llmgateway.entity.Project;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProjectRepository extends JpaRepository<Project, Long> {
    boolean existsByTenantTenantIdAndName(Long tenantId, String name);

    List<Project> findByTenantTenantId(Long tenantId);

    List<Project> findByTenantTenantIdOrderByProjectIdAsc(Long tenantId);

    Optional<Project> findFirstByNameOrderByProjectIdAsc(String name);
}
