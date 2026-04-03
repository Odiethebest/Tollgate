package com.example.demo.repository;

import com.example.demo.entity.DeniedEvent;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DeniedEventRepository extends JpaRepository<DeniedEvent, Long> {
}
