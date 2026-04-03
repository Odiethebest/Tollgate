package com.example.demo.dto;

public record CreateProjectRequest(
        Long tenantId,
        String name,
        String environment
) {
}
