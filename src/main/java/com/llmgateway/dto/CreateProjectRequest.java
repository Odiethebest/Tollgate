package com.llmgateway.dto;

public record CreateProjectRequest(
        Long tenantId,
        String name,
        String environment
) {
}
