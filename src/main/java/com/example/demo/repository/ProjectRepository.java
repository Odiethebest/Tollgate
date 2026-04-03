package com.example.demo.repository;

import com.example.demo.entity.Project;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProjectRepository extends JpaRepository<Project, Long> {
    boolean existsByTenantTenantIdAndName(Long tenantId, String name);

    List<Project> findByTenantTenantId(Long tenantId);
}
