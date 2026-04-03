package com.example.demo.repository;

import com.example.demo.entity.LlmModel;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LlmModelRepository extends JpaRepository<LlmModel, Long> {
}
