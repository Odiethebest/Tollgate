package com.llmgateway.dto;

public record CreateTenantRequest(
        String name,
        String contactEmail,
        String status
) {
}
