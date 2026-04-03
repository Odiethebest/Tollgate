package com.llmgateway.repository;

import com.llmgateway.entity.LlmModel;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LlmModelRepository extends JpaRepository<LlmModel, Long> {
}
