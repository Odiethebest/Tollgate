package com.example.demo.dto;

import java.time.LocalDateTime;

public record ProjectResponse(
        Long projectId,
        Long tenantId,
        String name,
        String environment,
        LocalDateTime createdAt
) {
}
