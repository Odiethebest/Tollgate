package com.llmgateway.dto;

import java.time.LocalDateTime;

public record TenantResponse(
        Long tenantId,
        String name,
        String contactEmail,
        String status,
        LocalDateTime createdAt
) {
}
